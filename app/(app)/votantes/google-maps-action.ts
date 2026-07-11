"use server";

import { requireUsuario } from "@/lib/session";
import {
  extraerCoordenadas,
  esLinkCortoGoogleMaps,
  esUrlGoogleMaps,
  type LatLng,
} from "@/lib/google-maps";

export type ImportarUbicacionResponse =
  | { ok: true; coords: LatLng }
  | { ok: false; error: string };

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

/**
 * Sigue el redirect de un link corto de Google (maps.app.goo.gl, goo.gl, g.co)
 * y devuelve la URL final más el cuerpo de la respuesta, donde suelen quedar las
 * coordenadas. Sólo se resuelven hosts de Google (evita usar el server como
 * proxy de URLs arbitrarias).
 */
async function resolverLinkCorto(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
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
  return `${res.url}\n${cuerpo}`;
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
      const resuelto = await resolverLinkCorto(url);
      const coords = extraerCoordenadas(resuelto);
      if (coords) return { ok: true, coords };
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
