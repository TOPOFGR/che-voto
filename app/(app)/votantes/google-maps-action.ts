"use server";

import { requireUsuario } from "@/lib/session";
import {
  extraerCoordenadas,
  esLinkCortoGoogleMaps,
  esUrlGoogleMaps,
  urlBusquedaMapa,
  type LatLng,
} from "@/lib/google-maps";

export type ImportarUbicacionResponse =
  | { ok: true; coords: LatLng }
  | { ok: false; error: string };

// Ojo: con un User-Agent de navegador de escritorio, maps.app.goo.gl responde
// 200 con una página intermedia (sin redirect ni coordenadas). Con un UA que no
// es de navegador devuelve el 302 a la URL larga de Maps.
const USER_AGENT = "CheVoto/1.0";

/**
 * Pide una URL de Google siguiendo redirects y devuelve la URL final más el
 * cuerpo de la respuesta, donde suelen quedar las coordenadas. Sólo se llama con
 * hosts de Google (evita usar el server como proxy de URLs arbitrarias).
 */
async function pedirGoogle(url: string): Promise<{ url: string; texto: string }> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  // La URL final (res.url) casi siempre ya trae la coordenada; el cuerpo se
  // suma como respaldo por si quedó sólo en el HTML.
  let cuerpo = "";
  try {
    cuerpo = await res.text();
  } catch {
    // Sin cuerpo: nos quedamos con la URL final.
  }
  return { url: res.url, texto: `${res.url}\n${cuerpo}` };
}

/**
 * Extrae la ubicación de un link de Google Maps pegado por el usuario. Los links
 * largos se parsean directo; los cortos se resuelven server-side (redirect
 * cross-origin que el navegador no puede seguir por CORS).
 */
export async function importarUbicacionGoogleMaps(
  rawUrl: string,
): Promise<ImportarUbicacionResponse> {
  await requireUsuario();

  const url = (rawUrl ?? "").trim();
  if (!url) {
    return { ok: false, error: "Pegá un link de Google Maps." };
  }
  if (!esUrlGoogleMaps(url)) {
    return { ok: false, error: "Ese link no parece ser de Google Maps." };
  }

  // 1. Link largo: la coordenada suele estar en la propia URL.
  const directo = extraerCoordenadas(url);
  if (directo) return { ok: true, coords: directo };

  // 2. Link corto: seguimos el redirect y parseamos la URL/HTML resultante.
  if (esLinkCortoGoogleMaps(url)) {
    try {
      const resuelto = await pedirGoogle(url);
      const coords = extraerCoordenadas(resuelto.texto);
      if (coords) return { ok: true, coords };

      // share.google termina en una búsqueda de Google sin coordenadas:
      // repetimos la búsqueda en modo mapa para obtener el punto del lugar.
      const busqueda = urlBusquedaMapa(resuelto.url);
      if (busqueda) {
        const mapa = await pedirGoogle(busqueda);
        const coordsMapa = extraerCoordenadas(mapa.texto);
        if (coordsMapa) return { ok: true, coords: coordsMapa };
      }
    } catch {
      return {
        ok: false,
        error: "No se pudo abrir el link. Reintentá o cargá el punto en el mapa.",
      };
    }
  }

  return {
    ok: false,
    error: "No encontramos la ubicación en ese link. Probá con otro o marcá el mapa.",
  };
}
