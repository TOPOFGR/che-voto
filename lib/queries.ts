import "server-only";
import sql from "@/lib/db";
import { slugify } from "@/lib/slug";
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
  sobrenombre: string | null;
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
  // 'carga_manual' | 'formulario_publico' | ... — marca a los que se sumaron solos.
  fuente_dato: string | null;
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
      sql`(p.nombre ILIKE ${like} OR p.sobrenombre ILIKE ${like}
          OR p.apellido ILIKE ${like}
          OR p.numero_cedula ILIKE ${like} OR p.telefono ILIKE ${like})`,
    );
  }
  if (filtros.intencion_partido)
    conditions.push(sql`v.intencion_partido = ${filtros.intencion_partido}`);
  if (filtros.habilitado === "si") conditions.push(sql`p.habilitado IS TRUE`);
  if (filtros.habilitado === "no") conditions.push(sql`p.habilitado IS FALSE`);

  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);

  return sql<VotanteRow[]>`
    SELECT p.id, p.nombre, p.sobrenombre, p.apellido, p.telefono, p.numero_cedula, p.direccion,
           p.territorio_id, t.nombre AS territorio_nombre,
           p.habilitado, p.precisa_transporte,
           v.intencion_partido, v.estado_voto, v.fue_buscado, v.agradecido,
           v.referente_id, r.nombre AS referente_nombre,
           (p.ubicacion IS NOT NULL) AS tiene_ubicacion,
           p.fuente_dato,
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
  foto_updated_at: string | null;
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
      u.superior_id, s.nombre AS superior_nombre, u.foto_updated_at,
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
  sobrenombre?: string | null;
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
        (campaign_id, numero_cedula, nombre, sobrenombre, telefono, direccion, ubicacion,
         fecha_nacimiento, precisa_transporte, habilitado,
         padron_distrito, padron_departamento, padron_zona, padron_local,
         padron_consultado_at, fuente_dato)
      VALUES
        (${usuario.campaign_id}, ${data.numero_cedula}, ${data.nombre},
         ${data.sobrenombre ?? null},
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

/**
 * Devuelve el slug público del usuario, generándolo (y persistiéndolo) la
 * primera vez. Base = kebab-case del nombre; ante colisión agrega sufijo
 * numérico (`nombre-2`, `-3`, …). El índice único parcial `usuarios_slug_key`
 * es la garantía real de unicidad: si dos requests corren a la vez, el UPDATE
 * perdedor viola el índice, lo reintentamos leyendo el slug ya asignado.
 */
export async function getOrCreateSlugForUsuario(usuario: Usuario): Promise<string> {
  if (usuario.slug) return usuario.slug;

  const base = slugify(usuario.nombre) || "usuario";
  for (let intento = 0; intento < 25; intento++) {
    const candidato = intento === 0 ? base : `${base}-${intento + 1}`;
    const tomado = await sql<{ id: string }[]>`
      SELECT id FROM usuarios WHERE slug = ${candidato} LIMIT 1
    `;
    if (tomado.length) continue;
    try {
      const [row] = await sql<{ slug: string }[]>`
        UPDATE usuarios SET slug = ${candidato}, updated_at = now()
        WHERE id = ${usuario.id} AND slug IS NULL
        RETURNING slug
      `;
      // Ya tenía uno (otro request ganó): devolvé el vigente.
      if (!row) {
        const [actual] = await sql<{ slug: string | null }[]>`
          SELECT slug FROM usuarios WHERE id = ${usuario.id} LIMIT 1
        `;
        if (actual?.slug) return actual.slug;
        continue;
      }
      return row.slug;
    } catch {
      // Colisión en el índice único: probamos el siguiente sufijo.
      continue;
    }
  }
  // Fallback improbable: cae al id (siempre único) para no romper el link.
  await sql`UPDATE usuarios SET slug = ${usuario.id} WHERE id = ${usuario.id} AND slug IS NULL`;
  return usuario.id;
}

/**
 * Personaliza el link "Quiero apoyar": guarda el nombre a mostrar y regenera el
 * slug a partir de él (con sufijo numérico ante colisión con OTRO usuario).
 * El nombre a mostrar alimenta encabezado, stickers y slug (como el mockup).
 * Devuelve el slug resultante (puede diferir de lo tipeado si hubo colisión).
 */
export async function actualizarLinkApoyo(
  usuario: Usuario,
  apoyoNombre: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const nombre = apoyoNombre.trim();
  if (nombre.length < 3) {
    return { ok: false, error: "El nombre a mostrar es muy corto." };
  }
  const base = slugify(nombre);
  if (!base) {
    return { ok: false, error: "Usá al menos una letra o número en el nombre." };
  }

  for (let intento = 0; intento < 25; intento++) {
    const candidato = intento === 0 ? base : `${base}-${intento + 1}`;
    // ¿Lo tiene otro usuario? (el propio no cuenta: puede re-guardar su slug)
    const tomado = await sql<{ id: string }[]>`
      SELECT id FROM usuarios WHERE slug = ${candidato} AND id <> ${usuario.id} LIMIT 1
    `;
    if (tomado.length) continue;
    try {
      await sql`
        UPDATE usuarios
        SET apoyo_nombre = ${nombre}, slug = ${candidato}, updated_at = now()
        WHERE id = ${usuario.id}
      `;
      return { ok: true, slug: candidato };
    } catch {
      // Colisión de carrera en el índice único: probamos el siguiente sufijo.
      continue;
    }
  }
  return { ok: false, error: "No pudimos generar un link con ese nombre. Probá otro." };
}

export interface DirigentePublico {
  id: string;
  nombre: string;
  apoyo_nombre: string | null;
  campaign_id: string;
  foto_updated_at: string | null;
}

/** Resolve the sharing dirigente behind a public /apoyar/<slug> link. */
export async function getDirigentePorSlug(
  slug: string,
): Promise<DirigentePublico | null> {
  const rows = await sql<DirigentePublico[]>`
    SELECT id, nombre, apoyo_nombre, campaign_id, foto_updated_at
    FROM usuarios
    WHERE slug = ${slug} AND activo = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface DatosApoyoPublico {
  nombre: string;
  telefono: string;
  numero_cedula: string | null;
  direccion: string | null;
  quiere_stickers: boolean;
  quiere_voluntario: boolean;
}

/**
 * Alta de un votante desde el formulario público "Quiero apoyar". No hay sesión:
 * la campaña y el referente salen del `dirigente` ya resuelto por el slug (nunca
 * de datos del cliente). Se marca `fuente_dato = 'formulario_publico'` para
 * distinguirlos en la lista. Espeja la tx de createVotante.
 */
export async function crearApoyoPublico(
  dirigente: DirigentePublico,
  data: DatosApoyoPublico,
): Promise<string> {
  return sql.begin(async (tx) => {
    const [persona] = await tx<{ id: string }[]>`
      INSERT INTO personas
        (campaign_id, nombre, telefono, numero_cedula, direccion, fuente_dato)
      VALUES
        (${dirigente.campaign_id}, ${data.nombre}, ${data.telefono},
         ${data.numero_cedula}, ${data.direccion}, 'formulario_publico')
      RETURNING id
    `;

    await tx`
      INSERT INTO vinculos_campania
        (campaign_id, persona_id, referente_id, intencion_partido, estado_voto,
         quiere_stickers, quiere_voluntario)
      VALUES
        (${dirigente.campaign_id}, ${persona.id}, ${dirigente.id},
         'desconozco', 'pendiente', ${data.quiere_stickers}, ${data.quiere_voluntario})
    `;

    return persona.id;
  });
}

export interface VotanteDetalle {
  id: string;
  nombre: string;
  sobrenombre: string | null;
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
  quiere_stickers: boolean;
  quiere_voluntario: boolean;
  lat: number | null;
  lng: number | null;
  referente_id: string | null;
  fuente_dato: string | null;
}

/** A single voter, only if it's visible to the user (hierarchy scope). */
export async function getVotante(
  usuario: Usuario,
  id: string,
): Promise<VotanteDetalle | null> {
  const scope = await getScope(usuario);
  const cond = scopeCondition(usuario, scope);
  const rows = await sql<VotanteDetalle[]>`
    SELECT p.id, p.nombre, p.sobrenombre, p.numero_cedula, p.telefono, p.direccion,
           to_char(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
           p.precisa_transporte, p.habilitado,
           p.padron_distrito, p.padron_departamento, p.padron_zona, p.padron_local,
           v.intencion_partido, v.estado_voto, v.fue_buscado, v.agradecido,
           v.quiere_stickers, v.quiere_voluntario,
           ST_Y(p.ubicacion::geometry) AS lat, ST_X(p.ubicacion::geometry) AS lng,
           v.referente_id, p.fuente_dato
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
        sobrenombre = ${data.sobrenombre ?? null},
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

// --- Perfil propio -----------------------------------------------------------

export interface ActualizarPerfil {
  nombre: string;
  // Foto ya redimensionada en el cliente (o null si no se cambia).
  foto?: { bytes: Buffer; mime: string } | null;
  // Borrar la foto actual (tiene prioridad sobre `foto`).
  eliminarFoto?: boolean;
}

/**
 * Actualiza el nombre (y opcionalmente la foto) del usuario logueado. Los bytes
 * de la foto se guardan en `usuario_fotos`; en `usuarios` sólo se toca el
 * `foto_updated_at` que actúa de flag + cache-buster del avatar.
 */
export async function actualizarMiPerfil(
  usuario: Usuario,
  data: ActualizarPerfil,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE usuarios
      SET nombre = ${data.nombre}, updated_at = now()
      WHERE id = ${usuario.id}
    `;

    if (data.eliminarFoto) {
      await tx`DELETE FROM usuario_fotos WHERE usuario_id = ${usuario.id}`;
      await tx`UPDATE usuarios SET foto_updated_at = NULL WHERE id = ${usuario.id}`;
    } else if (data.foto) {
      await tx`
        INSERT INTO usuario_fotos (usuario_id, data, mime, updated_at)
        VALUES (${usuario.id}, ${data.foto.bytes}, ${data.foto.mime}, now())
        ON CONFLICT (usuario_id)
        DO UPDATE SET data = EXCLUDED.data, mime = EXCLUDED.mime, updated_at = now()
      `;
      await tx`UPDATE usuarios SET foto_updated_at = now() WHERE id = ${usuario.id}`;
    }
  });
}

/** Bytes + mime de la foto de perfil de un usuario (para el route handler). */
export async function getFotoPerfil(
  usuarioId: string,
): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await sql<{ data: Buffer; mime: string }[]>`
    SELECT data, mime FROM usuario_fotos WHERE usuario_id = ${usuarioId} LIMIT 1
  `;
  return rows[0] ?? null;
}
