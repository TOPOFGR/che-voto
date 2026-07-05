// Domain types mirroring the Postgres enums in the Neon schema.

export type RolUsuario =
  | "admin"
  | "jefe_campania"
  | "coordinador"
  | "referente"
  | "fiscal"
  | "analista";

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

export interface Usuario {
  id: string;
  campaign_id: string;
  auth_provider_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: RolUsuario;
  activo: boolean;
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

export type EstadoInvitacion = "pendiente" | "aceptada" | "revocada";

export interface Invitacion {
  id: string;
  campaign_id: string;
  token: string;
  email: string | null;
  nombre: string | null;
  rol: RolUsuario;
  invited_by: string;
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
  admin: { label: "Administrador", short: "Admin", nivel: 0, desc: "Acceso total al sistema" },
  jefe_campania: { label: "Jefe de Campaña", short: "Jefe", nivel: 1, desc: "Dirige toda la campaña" },
  coordinador: { label: "Coordinador", short: "Coord.", nivel: 2, desc: "Coordina una zona o distrito" },
  referente: { label: "Referente", short: "Ref.", nivel: 3, desc: "Contacto en el territorio, carga votantes" },
  fiscal: { label: "Fiscal", short: "Fiscal", nivel: 3, desc: "Control de mesa el día de la elección" },
  analista: { label: "Analista", short: "Analista", nivel: 2, desc: "Análisis de datos, solo lectura" },
};

// Roles that see every voter of the campaign (no territorial scoping).
export const ROLES_VISION_TOTAL: RolUsuario[] = [
  "admin",
  "jefe_campania",
  "analista",
];

// Roles allowed to invite new members. Read-only / leaf roles (analista,
// referente, fiscal) cannot invite anyone.
export const ROLES_QUE_INVITAN: RolUsuario[] = [
  "admin",
  "jefe_campania",
  "coordinador",
];

/**
 * Roles a given role may invite: strictly lower in the hierarchy (higher
 * `nivel` number). A superior can only bring in subordinates, never peers or
 * roles above them. Returns [] for roles that cannot invite at all.
 */
export function rolesInvitables(rol: RolUsuario): RolUsuario[] {
  if (!ROLES_QUE_INVITAN.includes(rol)) return [];
  const nivel = ROLES[rol].nivel;
  return (Object.keys(ROLES) as RolUsuario[]).filter(
    (r) => ROLES[r].nivel > nivel,
  );
}

export function puedeInvitar(rol: RolUsuario): boolean {
  return rolesInvitables(rol).length > 0;
}

export const ETAPAS: Record<EtapaEmbudo, { label: string; color: string }> = {
  contacto: { label: "Contacto", color: "#94a3b8" },
  simpatizante: { label: "Simpatizante", color: "#38bdf8" },
  voluntario: { label: "Voluntario", color: "#818cf8" },
  garantizado: { label: "Garantizado", color: "#22c55e" },
  indeciso: { label: "Indeciso", color: "#f59e0b" },
  opositor: { label: "Opositor", color: "#ef4444" },
  no_contactar: { label: "No contactar", color: "#6b7280" },
};

export const INTENCIONES: Record<IntencionVoto, { label: string; peso: number }> = {
  a_favor: { label: "A favor", peso: 1.0 },
  probable: { label: "Probable", peso: 0.7 },
  indeciso: { label: "Indeciso", peso: 0.4 },
  improbable: { label: "Improbable", peso: 0.15 },
  en_contra: { label: "En contra", peso: 0 },
  desconocida: { label: "Desconocida", peso: 0.3 },
};

export const TIPOS_TERRITORIO: Record<TipoTerritorio, string> = {
  pais: "País",
  departamento: "Departamento",
  distrito: "Distrito",
  zona: "Zona",
  barrio: "Barrio",
  seccional: "Seccional",
};
