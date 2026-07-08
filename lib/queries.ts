import "server-only";
import sql from "@/lib/db";
import { ROLES_VISION_TOTAL } from "@/lib/types";
import type {
  Campaign,
  EstadoVoto,
  EtapaEmbudo,
  IntencionPartido,
  IntencionVoto,
  Territorio,
  Usuario,
} from "@/lib/types";

export async function getActiveCampaign(): Promise<Campaign | null> {
  const rows = await sql<Campaign[]>`
    SELECT id, nombre, pais, tipo_eleccion, fecha_eleccion, activa
    FROM campaigns
    WHERE activa = true
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getTerritorios(campaignId: string) {
  return sql<
    (Territorio & { parent_nombre: string | null; votantes: number })[]
  >`
    SELECT t.id, t.campaign_id, t.parent_id, t.nombre, t.tipo,
           p.nombre AS parent_nombre,
           (SELECT count(*)::int FROM personas pe WHERE pe.territorio_id = t.id) AS votantes
    FROM territorios t
    LEFT JOIN territorios p ON p.id = t.parent_id
    WHERE t.campaign_id = ${campaignId}
    ORDER BY t.tipo, t.nombre
  `;
}

/**
 * The user plus every descendant in the invitation hierarchy (recursive over
 * `usuarios.superior_id`). Always includes the user themselves, so a user with
 * no subordinates still sees the voters they personally loaded. This is the
 * basis of voter visibility: a voter is visible if its owner (referente_id)
 * falls in this set.
 */
async function getSubordinadoIds(usuario: Usuario): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    WITH RECURSIVE arbol AS (
      SELECT id FROM usuarios
      WHERE id = ${usuario.id} AND campaign_id = ${usuario.campaign_id}
      UNION
      SELECT u.id FROM usuarios u JOIN arbol a ON u.superior_id = a.id
    )
    SELECT id FROM arbol
  `;
  return rows.map((r) => r.id);
}

export interface VotanteRow {
  id: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  numero_cedula: string | null;
  direccion: string | null;
  territorio_nombre: string | null;
  intencion_partido: IntencionPartido | null;
  habilitado: boolean | null;
  precisa_transporte: boolean;
  estado_voto: string | null;
  fue_buscado: boolean;
  agradecido: boolean;
  referente_id: string | null;
  referente_nombre: string | null;
  tiene_ubicacion: boolean;
  created_at: string;
}

export interface VotanteFiltros {
  q?: string;
  intencion_partido?: IntencionPartido;
  habilitado?: "si" | "no";
}

interface Scope {
  visionTotal: boolean;
  referenteIds: string[];
}

async function getScope(usuario: Usuario): Promise<Scope> {
  if (ROLES_VISION_TOTAL.includes(usuario.rol)) {
    // administrador → every voter of the campaign.
    return { visionTotal: true, referenteIds: [] };
  }
  return { visionTotal: false, referenteIds: await getSubordinadoIds(usuario) };
}

/**
 * Build the WHERE fragment that enforces hierarchy-based row visibility.
 * Synchronous on purpose: fragments must never be awaited (that would run them
 * as standalone queries). Await getScope() first, then call this.
 */
function scopeCondition(usuario: Usuario, scope: Scope) {
  if (scope.visionTotal) {
    return sql`p.campaign_id = ${usuario.campaign_id}`;
  }
  // Voters whose owner (referente) is the user or anyone below them in the tree.
  // Cast the array to uuid[]: postgres.js binds it as text[], and there's no
  // implicit uuid = text operator (scalar params coerce, array params don't).
  return sql`p.campaign_id = ${usuario.campaign_id}
    AND v.referente_id = ANY(${sql.array(scope.referenteIds)}::uuid[])`;
}

export async function getVotantes(
  usuario: Usuario,
  filtros: VotanteFiltros = {},
): Promise<VotanteRow[]> {
  const scope = await getScope(usuario);
  const conditions = [scopeCondition(usuario, scope)];
  if (filtros.q) {
    const like = `%${filtros.q}%`;
    conditions.push(
      sql`(p.nombre ILIKE ${like} OR p.apellido ILIKE ${like}
          OR p.numero_cedula ILIKE ${like} OR p.telefono ILIKE ${like})`,
    );
  }
  if (filtros.intencion_partido)
    conditions.push(sql`v.intencion_partido = ${filtros.intencion_partido}`);
  if (filtros.habilitado === "si") conditions.push(sql`p.habilitado IS TRUE`);
  if (filtros.habilitado === "no") conditions.push(sql`p.habilitado IS FALSE`);

  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);

  return sql<VotanteRow[]>`
    SELECT p.id, p.nombre, p.apellido, p.telefono, p.numero_cedula, p.direccion,
           p.territorio_id, t.nombre AS territorio_nombre,
           p.habilitado, p.precisa_transporte,
           v.intencion_partido, v.estado_voto, v.fue_buscado, v.agradecido,
           v.referente_id, r.nombre AS referente_nombre,
           (p.ubicacion IS NOT NULL) AS tiene_ubicacion,
           p.created_at
    FROM personas p
    LEFT JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    LEFT JOIN territorios t ON t.id = p.territorio_id
    LEFT JOIN usuarios r ON r.id = v.referente_id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT 500
  `;
}

export interface HeatPoint {
  lat: number;
  lng: number;
  etapa: EtapaEmbudo | null;
  intencion: IntencionVoto | null;
}

// El mapa de calor sigue ponderando por el embudo (etapa/intención de relación),
// independiente de los filtros de la lista de votantes.
export interface HeatFiltros {
  etapa?: EtapaEmbudo;
  intencion?: IntencionVoto;
}

export async function getHeatmapPoints(
  usuario: Usuario,
  filtros: HeatFiltros = {},
): Promise<HeatPoint[]> {
  const scope = await getScope(usuario);
  const conditions = [scopeCondition(usuario, scope), sql`p.ubicacion IS NOT NULL`];
  if (filtros.etapa) conditions.push(sql`v.etapa = ${filtros.etapa}`);
  if (filtros.intencion) conditions.push(sql`v.intencion = ${filtros.intencion}`);
  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);

  return sql<HeatPoint[]>`
    SELECT ST_Y(p.ubicacion::geometry) AS lat,
           ST_X(p.ubicacion::geometry) AS lng,
           v.etapa, v.intencion
    FROM personas p
    LEFT JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${where}
  `;
}

export interface DashboardStats {
  total: number;
  habilitados: number;
  /** Habilitados con intención por el partido del usuario; para el admin es el total. */
  intencion: number;
  con_ubicacion: number;
  por_intencion_partido: { intencion_partido: IntencionPartido; n: number }[];
}

/**
 * El dashboard solo muestra lo que realmente se captura en el alta:
 * habilitación (padrón) e intención de voto por partido. La etapa del embudo
 * y la intención de relación no se cargan hoy, así que no se reportan.
 */
export async function getDashboardStats(
  usuario: Usuario,
): Promise<DashboardStats> {
  const scopeCtx = await getScope(usuario);
  const scope = scopeCondition(usuario, scopeCtx);
  const [totals] = await sql<
    { total: number; habilitados: number; con_ubicacion: number }[]
  >`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE p.habilitado IS TRUE)::int AS habilitados,
           count(*) FILTER (WHERE p.ubicacion IS NOT NULL)::int AS con_ubicacion
    FROM personas p
    LEFT JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${scope}
  `;

  // "Intención": votantes habilitados cuya intención de partido coincide con el
  // partido del usuario (su lista, sus listas de intendente, o las de su cadena
  // de superiores). El administrador no pertenece a un partido: ve el total.
  let intencion = totals?.total ?? 0;
  if (!ROLES_VISION_TOTAL.includes(usuario.rol)) {
    const [row] = await sql<{ n: number }[]>`
      WITH RECURSIVE cadena AS (
        SELECT id, superior_id, lista_id FROM usuarios
        WHERE id = ${usuario.id} AND campaign_id = ${usuario.campaign_id}
        UNION ALL
        SELECT u.id, u.superior_id, u.lista_id
        FROM usuarios u JOIN cadena c ON u.id = c.superior_id
      ),
      siglas AS (
        SELECT DISTINCT pa.sigla
        FROM (
          SELECT lista_id FROM cadena WHERE lista_id IS NOT NULL
          UNION
          SELECT il.lista_id FROM intendente_listas il JOIN cadena c ON il.usuario_id = c.id
        ) x
        JOIN listas l ON l.id = x.lista_id
        JOIN partidos pa ON pa.id = l.partido_id
      )
      SELECT count(*)::int AS n
      FROM personas p
      JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
      WHERE ${scope}
        AND p.habilitado IS TRUE
        AND v.intencion_partido::text IN (SELECT sigla FROM siglas)
    `;
    intencion = row?.n ?? 0;
  }

  const porIntencionPartido = await sql<{ intencion_partido: IntencionPartido; n: number }[]>`
    SELECT v.intencion_partido, count(*)::int AS n
    FROM personas p
    JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${scope}
    GROUP BY v.intencion_partido
  `;

  return {
    total: totals?.total ?? 0,
    habilitados: totals?.habilitados ?? 0,
    intencion,
    con_ubicacion: totals?.con_ubicacion ?? 0,
    por_intencion_partido: porIntencionPartido,
  };
}

export interface MiembroEquipo {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: Usuario["rol"];
  superior_id: string | null;
  superior_nombre: string | null;
  activo: boolean;
  votantes_cargados: number;
}

/**
 * The team the user may see in the organigram: the administrador sees everyone;
 * anyone else sees only their own subtree (themselves + who they invited,
 * recursively) — never their superiors.
 */
export async function getEquipo(usuario: Usuario): Promise<MiembroEquipo[]> {
  const scope = await getScope(usuario);
  const where = scope.visionTotal
    ? sql`u.campaign_id = ${usuario.campaign_id}`
    : sql`u.campaign_id = ${usuario.campaign_id}
          AND u.id = ANY(${sql.array(scope.referenteIds)}::uuid[])`;
  return sql<MiembroEquipo[]>`
    SELECT u.id, u.nombre, u.email, u.telefono, u.rol, u.activo,
      u.superior_id, s.nombre AS superior_nombre,
      (SELECT count(*)::int FROM vinculos_campania vc WHERE vc.referente_id = u.id) AS votantes_cargados
    FROM usuarios u
    LEFT JOIN usuarios s ON s.id = u.superior_id
    WHERE ${where}
    ORDER BY u.nombre
  `;
}

export interface DatosPadron {
  habilitado?: boolean | null;
  padron_distrito?: string | null;
  padron_departamento?: string | null;
  padron_zona?: string | null;
  padron_local?: string | null;
}

// Campos que el usuario edita en el alta de votante (sección editable + padrón).
export interface DatosVotante extends DatosPadron {
  nombre: string;
  numero_cedula: string | null;
  fecha_nacimiento: string | null;
  telefono?: string | null;
  precisa_transporte: boolean;
  direccion?: string | null;
  intencion_partido: IntencionPartido;
  lat?: number | null;
  lng?: number | null;
}

export async function createVotante(usuario: Usuario, data: DatosVotante) {
  return sql.begin(async (tx) => {
    const ubic =
      data.lat != null && data.lng != null
        ? tx`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography`
        : tx`NULL`;
    const padronConsultado = data.habilitado != null ? tx`now()` : tx`NULL`;

    const [persona] = await tx<{ id: string }[]>`
      INSERT INTO personas
        (campaign_id, numero_cedula, nombre, telefono, direccion, ubicacion,
         fecha_nacimiento, precisa_transporte, habilitado,
         padron_distrito, padron_departamento, padron_zona, padron_local,
         padron_consultado_at, fuente_dato)
      VALUES
        (${usuario.campaign_id}, ${data.numero_cedula}, ${data.nombre},
         ${data.telefono ?? null}, ${data.direccion ?? null}, ${ubic},
         ${data.fecha_nacimiento}, ${data.precisa_transporte}, ${data.habilitado ?? null},
         ${data.padron_distrito ?? null}, ${data.padron_departamento ?? null},
         ${data.padron_zona ?? null}, ${data.padron_local ?? null},
         ${padronConsultado}, 'carga_manual')
      RETURNING id
    `;

    await tx`
      INSERT INTO vinculos_campania
        (campaign_id, persona_id, referente_id, intencion_partido, estado_voto)
      VALUES
        (${usuario.campaign_id}, ${persona.id}, ${usuario.id},
         ${data.intencion_partido}, 'pendiente')
    `;

    return persona.id;
  });
}

export interface VotanteDetalle {
  id: string;
  nombre: string;
  numero_cedula: string | null;
  telefono: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  precisa_transporte: boolean;
  habilitado: boolean | null;
  padron_distrito: string | null;
  padron_departamento: string | null;
  padron_zona: string | null;
  padron_local: string | null;
  intencion_partido: IntencionPartido | null;
  estado_voto: EstadoVoto | null;
  fue_buscado: boolean;
  agradecido: boolean;
  lat: number | null;
  lng: number | null;
  referente_id: string | null;
}

/** A single voter, only if it's visible to the user (hierarchy scope). */
export async function getVotante(
  usuario: Usuario,
  id: string,
): Promise<VotanteDetalle | null> {
  const scope = await getScope(usuario);
  const cond = scopeCondition(usuario, scope);
  const rows = await sql<VotanteDetalle[]>`
    SELECT p.id, p.nombre, p.numero_cedula, p.telefono, p.direccion,
           to_char(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
           p.precisa_transporte, p.habilitado,
           p.padron_distrito, p.padron_departamento, p.padron_zona, p.padron_local,
           v.intencion_partido, v.estado_voto, v.fue_buscado, v.agradecido,
           ST_Y(p.ubicacion::geometry) AS lat, ST_X(p.ubicacion::geometry) AS lng,
           v.referente_id
    FROM personas p
    LEFT JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE p.id = ${id} AND ${cond}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Alta editable + estado GOTV (checkboxes de la vista de edición).
export interface ActualizarVotante extends DatosVotante {
  estado_voto: EstadoVoto;
  fue_buscado: boolean;
  agradecido: boolean;
}

/** Update an existing voter. Returns false if it isn't visible to the user. */
export async function updateVotante(
  usuario: Usuario,
  id: string,
  data: ActualizarVotante,
): Promise<boolean> {
  const actual = await getVotante(usuario, id);
  if (!actual) return false;

  await sql.begin(async (tx) => {
    const ubic =
      data.lat != null && data.lng != null
        ? tx`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography`
        : tx`ubicacion`;

    await tx`
      UPDATE personas SET
        nombre = ${data.nombre},
        numero_cedula = ${data.numero_cedula},
        telefono = ${data.telefono ?? null},
        direccion = ${data.direccion ?? null},
        fecha_nacimiento = ${data.fecha_nacimiento},
        precisa_transporte = ${data.precisa_transporte},
        habilitado = ${data.habilitado ?? null},
        padron_distrito = ${data.padron_distrito ?? null},
        padron_departamento = ${data.padron_departamento ?? null},
        padron_zona = ${data.padron_zona ?? null},
        padron_local = ${data.padron_local ?? null},
        ubicacion = ${ubic},
        updated_at = now()
      WHERE id = ${id} AND campaign_id = ${usuario.campaign_id}
    `;
    await tx`
      UPDATE vinculos_campania SET
        intencion_partido = ${data.intencion_partido},
        estado_voto = ${data.estado_voto},
        fue_buscado = ${data.fue_buscado},
        agradecido = ${data.agradecido},
        updated_at = now()
      WHERE persona_id = ${id} AND campaign_id = ${usuario.campaign_id}
    `;
  });
  return true;
}
