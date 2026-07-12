// Domain types mirroring the Postgres enums in the Neon schema.

export type RolUsuario =
  | "administrador"
  | "intendente"
  | "concejal"
  | "dirigente";

export type TipoTerritorio =
  | "pais"
  | "departamento"
  | "distrito"
  | "zona"
  | "barrio"
  | "seccional";

export type EtapaEmbudo =
  | "contacto"
  | "simpatizante"
  | "voluntario"
  | "garantizado"
  | "indeciso"
  | "opositor"
  | "no_contactar";

export type IntencionVoto =
  | "a_favor"
  | "probable"
  | "indeciso"
  | "improbable"
  | "en_contra"
  | "desconocida";

export type EstadoVoto = "pendiente" | "voto" | "no_voto" | "no_aplica";

// Intención de voto por partido (dropdown del alta de votante).
export type IntencionPartido =
  | "ANR"
  | "PLRA"
  | "PPQ"
  | "otro"
  | "ninguno"
  | "desconozco";

export interface Usuario {
  id: string;
  campaign_id: string;
  auth_provider_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: RolUsuario;
  // Jerarquía usuario→usuario que define la visibilidad: para un dirigente es
  // quien lo invitó; para un concejal, su intendente; intendente/administrador
  // tienen superior_id null. nivel_dirigente ordena los sub-niveles de dirigentes.
  superior_id: string | null;
  nivel_dirigente: number | null;
  // Lista única del concejal (los intendentes usan intendente_listas para N listas).
  lista_id: string | null;
  // Identificador público estable para el link "Quiero apoyar" (/apoyar/<slug>).
  slug: string | null;
  // Nombre público personalizable del link (p.ej. "Jaz Concejal"); de acá sale
  // el slug, el encabezado y los stickers. Si es null, se usa `nombre`.
  apoyo_nombre: string | null;
  activo: boolean;
  // Timestamp de la última foto de perfil (null = sin foto). Los bytes viven en
  // la tabla `usuario_fotos`; acá sólo el flag/cache-buster (ver migración 05).
  foto_updated_at: string | null;
  created_at: string;
  updated_at: string;
  campaign_nombre?: string;
}

export interface Campaign {
  id: string;
  nombre: string;
  pais: string;
  tipo_eleccion: string | null;
  fecha_eleccion: string | null;
  activa: boolean;
}

export interface Territorio {
  id: string;
  campaign_id: string;
  parent_id: string | null;
  nombre: string;
  tipo: TipoTerritorio;
}

export interface Partido {
  id: string;
  campaign_id: string;
  nombre: string;
  sigla: string;
  activo: boolean;
}

export interface Lista {
  id: string;
  campaign_id: string;
  partido_id: string;
  nombre: string;
  numero: string | null;
  activo: boolean;
  // Denormalizado para display.
  partido_sigla?: string;
  partido_nombre?: string;
}

export type EstadoInvitacion = "pendiente" | "aceptada" | "revocada";

export interface Invitacion {
  id: string;
  campaign_id: string;
  token: string;
  email: string | null;
  nombre: string | null;
  rol: RolUsuario;
  invited_by: string;
  // Superior objetivo (p.ej. el intendente de un concejal) y lista objetivo.
  // Si superior_id es null, al aceptar se usa invited_by.
  superior_id: string | null;
  lista_id: string | null;
  estado: EstadoInvitacion;
  accepted_by: string | null;
  expires_at: string | null;
  created_at: string;
}

// Metadata for display of each role.
export const ROLES: Record<
  RolUsuario,
  { label: string; short: string; nivel: number; desc: string }
> = {
  administrador: { label: "Administrador", short: "Admin", nivel: 0, desc: "Acceso total al sistema" },
  intendente: { label: "Intendente", short: "Intend.", nivel: 1, desc: "Cabeza de una o más listas, ve todo lo que está debajo" },
  concejal: { label: "Concejal", short: "Concejal", nivel: 2, desc: "Pertenece a una lista, ve a sus dirigentes y votantes" },
  dirigente: { label: "Dirigente", short: "Dirig.", nivel: 3, desc: "Carga votantes e invita a otros dirigentes" },
};

// Roles that see every voter of the campaign (no hierarchy scoping).
export const ROLES_VISION_TOTAL: RolUsuario[] = ["administrador"];

/**
 * Explicit invitation hierarchy. Unlike a strict `nivel` comparison, a dirigente
 * may invite other dirigentes (same level), so we spell the rules out.
 * - administrador → intendente, concejal, dirigente
 * - intendente    → concejal, dirigente
 * - concejal      → dirigente
 * - dirigente     → dirigente
 */
const INVITABLES: Record<RolUsuario, RolUsuario[]> = {
  administrador: ["intendente", "concejal", "dirigente"],
  intendente: ["concejal", "dirigente"],
  concejal: ["dirigente"],
  dirigente: ["dirigente"],
};

// Roles allowed to invite new members. Every role can invite someone.
export const ROLES_QUE_INVITAN: RolUsuario[] = (
  Object.keys(INVITABLES) as RolUsuario[]
).filter((r) => INVITABLES[r].length > 0);

/** Roles a given role may invite (see INVITABLES). */
export function rolesInvitables(rol: RolUsuario): RolUsuario[] {
  return INVITABLES[rol] ?? [];
}

export function puedeInvitar(rol: RolUsuario): boolean {
  return rolesInvitables(rol).length > 0;
}

// Colores del design system CheVoto (neutralidad política: sin rojo ni azul).
// La progresión hacia "garantizado" se lee como esmeralda cada vez más plena.
export const ETAPAS: Record<EtapaEmbudo, { label: string; color: string }> = {
  contacto: { label: "Contacto", color: "#94a3b8" },
  simpatizante: { label: "Simpatizante", color: "#6ed3ab" },
  voluntario: { label: "Voluntario", color: "#35bc8b" },
  garantizado: { label: "Garantizado", color: "#0ea372" },
  indeciso: { label: "Indeciso", color: "#fdba74" },
  opositor: { label: "Opositor", color: "#c2410c" },
  no_contactar: { label: "No contactar", color: "#64748b" },
};

export const INTENCIONES: Record<IntencionVoto, { label: string; peso: number }> = {
  a_favor: { label: "A favor", peso: 1.0 },
  probable: { label: "Probable", peso: 0.7 },
  indeciso: { label: "Indeciso", peso: 0.4 },
  improbable: { label: "Improbable", peso: 0.15 },
  en_contra: { label: "En contra", peso: 0 },
  desconocida: { label: "Desconocida", peso: 0.3 },
};

export const INTENCIONES_PARTIDO: Record<IntencionPartido, string> = {
  ANR: "ANR",
  PLRA: "PLRA",
  PPQ: "PPQ",
  otro: "Otro partido",
  ninguno: "Ninguno",
  desconozco: "Desconozco",
};

export const TIPOS_TERRITORIO: Record<TipoTerritorio, string> = {
  pais: "País",
  departamento: "Departamento",
  distrito: "Distrito",
  zona: "Zona",
  barrio: "Barrio",
  seccional: "Seccional",
};
