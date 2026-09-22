/**
 * Parseo del JSON que manda la landing de Jazmín Galeano. Módulo puro (sin
 * "server-only") para poder validar el cuerpo antes de tocar la DB.
 *
 * Los nombres de campo aceptan español e inglés porque la landing aún no tiene
 * spec cerrada: cuando lleguen los nombres definitivos se pueden restringir
 * sin cambiar el contrato de "crear si no existe".
 */

export const FUENTE_LANDING_JAZMIN = "landing_jazmin";

export const MAX_VOTANTES_POR_REQUEST = 50;

export interface DatosLandingVotante {
  nombre: string;
  telefono: string | null;
  numero_cedula: string | null;
  direccion: string | null;
}

export type VotanteParseado =
  | { ok: true; data: DatosLandingVotante }
  | { ok: false; error: string };

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = str(obj[key]);
    if (v) return v;
  }
  return "";
}

/** Cédula: sólo dígitos, o null si no vino. */
export function normalizarCedula(v: string): string | null {
  const d = v.replace(/\D/g, "");
  return d || null;
}

export function parseVotanteLanding(raw: unknown): VotanteParseado {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Cada votante tiene que ser un objeto." };
  }
  const o = raw as Record<string, unknown>;

  const nombreCompleto = pick(o, ["nombre_completo", "full_name", "fullName"]);
  const nombres = pick(o, ["nombre", "nombres", "name", "first_name", "firstName"]);
  const apellido = pick(o, ["apellido", "apellidos", "last_name", "lastName"]);
  const nombre = nombreCompleto || [nombres, apellido].filter(Boolean).join(" ").trim();

  if (nombre.length < 3 || nombre.length > 120) {
    return { ok: false, error: "Ingresá el nombre del votante." };
  }

  const cedulaRaw = pick(o, ["numero_cedula", "cedula", "ci", "document", "documento"]);
  const numero_cedula = cedulaRaw ? normalizarCedula(cedulaRaw) : null;
  if (cedulaRaw && (!numero_cedula || numero_cedula.length < 4 || numero_cedula.length > 9)) {
    return { ok: false, error: "Revisá el número de cédula." };
  }

  const telefonoRaw = pick(o, ["telefono", "celular", "phone", "whatsapp"]);
  let telefono: string | null = null;
  if (telefonoRaw) {
    const digitos = telefonoRaw.replace(/\D/g, "").replace(/^595/, "0");
    if (digitos.length < 6 || digitos.length > 15) {
      return { ok: false, error: "Revisá el teléfono." };
    }
    telefono = digitos;
  }

  const direccionDirecta = pick(o, ["direccion", "dirección", "address"]);
  const barrio = pick(o, ["barrio", "neighborhood"]);
  const ciudad = pick(o, ["ciudad", "city"]);
  const partes = [barrio, ciudad].filter(Boolean);
  const direccion =
    direccionDirecta || (partes.length ? partes.join(", ") : "") || null;
  if (direccion && direccion.length > 200) {
    return { ok: false, error: "La dirección es demasiado larga." };
  }

  return { ok: true, data: { nombre, telefono, numero_cedula, direccion } };
}

/**
 * Acepta un objeto, un array, o `{ votantes | voters | data: [...] }`.
 * El honeypot (`apodo_confirmacion` / `website`) se detecta sobre el wrapper.
 */
export function extraerListaVotantes(body: unknown): {
  honeypot: boolean;
  items: unknown[];
  error?: string;
} {
  if (body == null) return { honeypot: false, items: [], error: "Cuerpo JSON vacío." };
  if (Array.isArray(body)) return { honeypot: false, items: body };

  if (typeof body !== "object") {
    return { honeypot: false, items: [], error: "El cuerpo tiene que ser JSON." };
  }

  const o = body as Record<string, unknown>;
  const honeypot = Boolean(str(o.apodo_confirmacion) || str(o.website) || str(o.hp));

  const lista = o.votantes ?? o.voters ?? o.data;
  if (Array.isArray(lista)) return { honeypot, items: lista };

  return { honeypot, items: [body] };
}
