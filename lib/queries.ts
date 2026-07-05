import "server-only";
import sql from "@/lib/db";
import { ROLES_VISION_TOTAL } from "@/lib/types";
import type {
  Campaign,
  EtapaEmbudo,
  IntencionVoto,
  Territorio,
  TipoTerritorio,
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
 * Territories a user can see: the ones directly assigned to them, plus every
 * descendant in the territorial tree. Returns [] for users with no assignment.
 */
async function getVisibleTerritorioIds(usuario: Usuario): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    WITH RECURSIVE asignados AS (
      SELECT territorio_id AS id
      FROM asignaciones_territoriales
      WHERE usuario_id = ${usuario.id} AND campaign_id = ${usuario.campaign_id}
    ),
    arbol AS (
      SELECT id FROM asignados
      UNION
      SELECT t.id FROM territorios t JOIN arbol a ON t.parent_id = a.id
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
  genero: string | null;
  territorio_id: string | null;
  territorio_nombre: string | null;
  etapa: EtapaEmbudo | null;
  intencion: IntencionVoto | null;
  estado_voto: string | null;
  referente_id: string | null;
  referente_nombre: string | null;
  tiene_ubicacion: boolean;
  created_at: string;
}

export interface VotanteFiltros {
  q?: string;
  etapa?: EtapaEmbudo;
  intencion?: IntencionVoto;
  territorioId?: string;
}

interface Scope {
  visionTotal: boolean;
  territorioIds: string[];
}

async function getScope(usuario: Usuario): Promise<Scope> {
  if (ROLES_VISION_TOTAL.includes(usuario.rol)) {
    // admin / jefe_campania / analista → every voter of the campaign.
    return { visionTotal: true, territorioIds: [] };
  }
  return { visionTotal: false, territorioIds: await getVisibleTerritorioIds(usuario) };
}

/**
 * Build the WHERE fragment that enforces role-based row visibility.
 * Synchronous on purpose: fragments must never be awaited (that would run them
 * as standalone queries). Await getScope() first, then call this.
 */
function scopeCondition(usuario: Usuario, scope: Scope) {
  if (scope.visionTotal) {
    return sql`p.campaign_id = ${usuario.campaign_id}`;
  }
  if (scope.territorioIds.length === 0) {
    // No territory assigned → only voters they personally loaded.
    return sql`p.campaign_id = ${usuario.campaign_id} AND v.referente_id = ${usuario.id}`;
  }
  return sql`p.campaign_id = ${usuario.campaign_id}
    AND (p.territorio_id = ANY(${sql.array(scope.territorioIds)}) OR v.referente_id = ${usuario.id})`;
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
  if (filtros.etapa) conditions.push(sql`v.etapa = ${filtros.etapa}`);
  if (filtros.intencion) conditions.push(sql`v.intencion = ${filtros.intencion}`);
  if (filtros.territorioId)
    conditions.push(sql`p.territorio_id = ${filtros.territorioId}`);

  const where = conditions.reduce((acc, c) => sql`${acc} AND ${c}`);

  return sql<VotanteRow[]>`
    SELECT p.id, p.nombre, p.apellido, p.telefono, p.numero_cedula, p.direccion,
           p.genero, p.territorio_id, t.nombre AS territorio_nombre,
           v.etapa, v.intencion, v.estado_voto,
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

export async function getHeatmapPoints(
  usuario: Usuario,
  filtros: VotanteFiltros = {},
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
  garantizados: number;
  simpatizantes: number;
  con_ubicacion: number;
  por_etapa: { etapa: EtapaEmbudo; n: number }[];
  por_intencion: { intencion: IntencionVoto; n: number }[];
}

export async function getDashboardStats(
  usuario: Usuario,
): Promise<DashboardStats> {
  const scopeCtx = await getScope(usuario);
  const scope = scopeCondition(usuario, scopeCtx);
  const [totals] = await sql<
    { total: number; garantizados: number; simpatizantes: number; con_ubicacion: number }[]
  >`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE v.etapa = 'garantizado')::int AS garantizados,
           count(*) FILTER (WHERE v.etapa = 'simpatizante')::int AS simpatizantes,
           count(*) FILTER (WHERE p.ubicacion IS NOT NULL)::int AS con_ubicacion
    FROM personas p
    LEFT JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${scope}
  `;
  const porEtapa = await sql<{ etapa: EtapaEmbudo; n: number }[]>`
    SELECT v.etapa, count(*)::int AS n
    FROM personas p
    JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${scope} AND v.etapa IS NOT NULL
    GROUP BY v.etapa
  `;
  const porIntencion = await sql<{ intencion: IntencionVoto; n: number }[]>`
    SELECT v.intencion, count(*)::int AS n
    FROM personas p
    JOIN vinculos_campania v ON v.persona_id = p.id AND v.campaign_id = p.campaign_id
    WHERE ${scope} AND v.intencion IS NOT NULL
    GROUP BY v.intencion
  `;
  return {
    total: totals?.total ?? 0,
    garantizados: totals?.garantizados ?? 0,
    simpatizantes: totals?.simpatizantes ?? 0,
    con_ubicacion: totals?.con_ubicacion ?? 0,
    por_etapa: porEtapa,
    por_intencion: porIntencion,
  };
}

export interface MiembroEquipo {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: Usuario["rol"];
  activo: boolean;
  territorios: { id: string; nombre: string; tipo: TipoTerritorio }[];
  votantes_cargados: number;
}

export async function getEquipo(campaignId: string): Promise<MiembroEquipo[]> {
  return sql<MiembroEquipo[]>`
    SELECT u.id, u.nombre, u.email, u.telefono, u.rol, u.activo,
      COALESCE(
        json_agg(json_build_object('id', t.id, 'nombre', t.nombre, 'tipo', t.tipo))
          FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS territorios,
      (SELECT count(*)::int FROM vinculos_campania vc WHERE vc.referente_id = u.id) AS votantes_cargados
    FROM usuarios u
    LEFT JOIN asignaciones_territoriales at ON at.usuario_id = u.id AND at.campaign_id = ${campaignId}
    LEFT JOIN territorios t ON t.id = at.territorio_id
    WHERE u.campaign_id = ${campaignId}
    GROUP BY u.id
    ORDER BY u.nombre
  `;
}

export interface NuevoVotante {
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  numero_cedula?: string | null;
  direccion?: string | null;
  genero?: string | null;
  fecha_nacimiento?: string | null;
  territorio_id?: string | null;
  etapa: EtapaEmbudo;
  intencion: IntencionVoto;
  lat?: number | null;
  lng?: number | null;
}

export async function createVotante(usuario: Usuario, data: NuevoVotante) {
  return sql.begin(async (tx) => {
    const ubic =
      data.lat != null && data.lng != null
        ? tx`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography`
        : tx`NULL`;

    const [persona] = await tx<{ id: string }[]>`
      INSERT INTO personas
        (campaign_id, territorio_id, numero_cedula, nombre, apellido, telefono,
         direccion, ubicacion, fecha_nacimiento, genero, fuente_dato)
      VALUES
        (${usuario.campaign_id}, ${data.territorio_id ?? null}, ${data.numero_cedula ?? null},
         ${data.nombre}, ${data.apellido ?? null}, ${data.telefono ?? null},
         ${data.direccion ?? null}, ${ubic}, ${data.fecha_nacimiento ?? null},
         ${data.genero ?? null}, 'carga_manual')
      RETURNING id
    `;

    await tx`
      INSERT INTO vinculos_campania
        (campaign_id, persona_id, referente_id, etapa, intencion, estado_voto)
      VALUES
        (${usuario.campaign_id}, ${persona.id}, ${usuario.id},
         ${data.etapa}, ${data.intencion}, 'pendiente')
    `;

    return persona.id;
  });
}
