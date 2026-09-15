/**
 * Límites y helpers de eventos compartidos por el cliente (forms) y el servidor
 * (actions, páginas). Módulo puro, sin "server-only".
 */

export const NOMBRE_EVENTO_MAX = 80;
// Tope de la descripción al cargarla, para que la página pública no sea invasiva.
export const DESCRIPCION_MAX = 1000;
// Caracteres visibles antes de "Saber más" en la página pública.
export const DESCRIPCION_PREVIEW = 180;

/**
 * Normaliza el link opcional "Saber más". Acepta links sin esquema
 * ("instagram.com/…") agregando https://. Devuelve null si está vacío y false si
 * no es un link http(s) válido (evita javascript:, data:, etc.).
 */
export function normalizarLink(raw: string): string | null | false {
  const v = raw.trim();
  if (!v) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(conEsquema);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!url.hostname.includes(".")) return false;
    return url.toString();
  } catch {
    return false;
  }
}

/**
 * Recorte de la descripción para la vista colapsada: corta en el último espacio
 * antes del límite (si no queda demasiado corto) y agrega "…". Devuelve null si
 * el texto entra entero y no hace falta "Saber más".
 */
export function recortarDescripcion(
  texto: string,
  max: number = DESCRIPCION_PREVIEW,
): string | null {
  if (texto.length <= max) return null;
  const corte = texto.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  const base = espacio > max * 0.6 ? corte.slice(0, espacio) : corte;
  return `${base.trimEnd()}…`;
}

/**
 * "YYYY-MM-DDTHH:MM" (hora de Paraguay, tal como sale de la DB) → "sábado, 20 de
 * septiembre · 19:00 hs". Se formatea en UTC a propósito: el valor ya está en
 * hora local y no hay que volver a convertirlo. Usar sólo en el servidor (evita
 * diferencias de ICU entre server y navegador en la hidratación).
 */
export function formatearFechaEvento(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return local;
  const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  const dia = new Intl.DateTimeFormat("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(fecha);
  return `${dia} · ${m[4]}:${m[5]} hs`;
}

export const SEXOS = { F: "Fem", M: "Masc" } as const;
export type Sexo = keyof typeof SEXOS;
