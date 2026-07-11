// Extrae coordenadas (lat/lng) de un link de Google Maps. Es una función pura
// e isomórfica (sirve en cliente y servidor) para poder testearla y reutilizarla
// desde el server action que resuelve los links cortos.
//
// Formatos que reconoce (en orden de preferencia):
//   1. !3d<lat>!4d<lng>       → marcador del lugar compartido (el más preciso)
//   2. ?q= / ll= / query= …   → coordenada explícita en la query
//   3. @<lat>,<lng>,<zoom>    → centro del viewport (fallback)
//   4. /place/<lat>,<lng>     → lugar sin nombre
//
// Los links cortos (maps.app.goo.gl, goo.gl/maps, g.co) no traen la coordenada:
// hay que seguir el redirect desde el servidor y después parsear la URL final.

export interface LatLng {
  lat: number;
  lng: number;
}

const HOSTS_CORTOS = ["maps.app.goo.gl", "goo.gl", "g.co"];

function esCoordenadaValida(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // 0,0 casi siempre es ruido (query vacía), no un lugar real cargado a mano.
    !(lat === 0 && lng === 0)
  );
}

/** ¿Es un link corto de Google que hay que resolver antes de parsear? */
export function esLinkCortoGoogleMaps(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return HOSTS_CORTOS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** ¿El host pertenece a Google Maps? (link largo o corto) */
export function esUrlGoogleMaps(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return (
      esLinkCortoGoogleMaps(url) ||
      host === "maps.google.com" ||
      host.endsWith(".google.com") ||
      host === "google.com" ||
      /(^|\.)google\.[a-z.]+$/.test(host)
    );
  } catch {
    return false;
  }
}

// Cada patrón captura lat en $1 y lng en $2. Se prueban en orden.
const PATRONES: RegExp[] = [
  // Marcador del lugar: !3d<lat>!4d<lng>
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  // Query explícita: q=, query=, ll=, sll=, center=, daddr=, destination= (con "loc:" opcional)
  /[?&](?:q|query|ll|sll|center|daddr|destination)=(?:loc:)?(-?\d+\.\d+)%2C(-?\d+\.\d+)/i,
  /[?&](?:q|query|ll|sll|center|daddr|destination)=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/i,
  // Centro del viewport: @<lat>,<lng>
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  // /place/<lat>,<lng> o /dir/<lat>,<lng>
  /\/(?:place|dir)\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,
];

/**
 * Intenta extraer una coordenada de una URL (o de cualquier texto que la
 * contenga, p. ej. el HTML de la página resuelta). Devuelve null si no encuentra
 * una coordenada válida.
 */
export function extraerCoordenadas(texto: string): LatLng | null {
  if (!texto) return null;
  // Muchos links traen las coordenadas percent-encoded (%2C = coma, etc.).
  let decodificado = texto;
  try {
    decodificado = decodeURIComponent(texto);
  } catch {
    // URL con % mal formado: seguimos con el texto original.
  }

  for (const fuente of [decodificado, texto]) {
    for (const re of PATRONES) {
      const m = re.exec(fuente);
      if (m) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (esCoordenadaValida(lat, lng)) return { lat, lng };
      }
    }
  }
  return null;
}
