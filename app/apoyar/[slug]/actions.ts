"use server";

import { headers } from "next/headers";
import { getDirigentePorSlug, crearApoyoPublico } from "@/lib/queries";
import { celularValidoPY, normalizarCelular } from "@/lib/celular";
import { checkRateLimit, hashIp, type RateRule } from "@/lib/rate-limit";

export type ApoyoState = { error: string } | { ok: true } | null;

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) || "").trim();
}

// Dos ventanas por IP: una corta corta ráfagas de bots, una larga corta el goteo
// sostenido. Holgadas a propósito: en PY el NAT de las operadoras hace que muchos
// votantes reales compartan una misma IP pública (p.ej. en un acto). Ajustables.
const REGLAS_APOYO: RateRule[] = [
  { limit: 8, windowSeconds: 60 }, // 8 por minuto
  { limit: 40, windowSeconds: 60 * 30 }, // 40 por media hora
];

/** IP del cliente detrás del proxy/host (primer hop de x-forwarded-for). */
async function ipDelCliente(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const primera = xff?.split(",")[0]?.trim();
  return primera || h.get("x-real-ip") || "desconocida";
}

/**
 * Alta pública "Quiero apoyar" — sin sesión. El referente/campaña salen del
 * dirigente que se re-resuelve por el slug del server (nunca de datos del
 * cliente: la action es un endpoint POST abierto). Devuelve {error} para el
 * form o {ok:true} para pasar a la pantalla de gracias.
 *
 * Anti-spam del endpoint que crea votantes: (1) honeypot — un campo oculto que
 * sólo completan los bots; (2) rate limit por IP respaldado en la DB. Nota: un
 * DDoS real se ataja en el borde (WAF/Cloudflare del host); esto frena el abuso
 * a nivel aplicación.
 */
export async function enviarApoyo(
  _prev: ApoyoState,
  formData: FormData,
): Promise<ApoyoState> {
  // Honeypot: campo invisible para humanos. Si viene lleno, es un bot →
  // simulamos éxito para no darle pistas, pero no escribimos nada.
  if (str(formData, "apodo_confirmacion")) return { ok: true };

  // Rate limit por IP antes de tocar la DB de votantes.
  const limite = await checkRateLimit(`apoyo:${hashIp(await ipDelCliente())}`, REGLAS_APOYO);
  if (!limite.ok) {
    const min = Math.ceil(limite.retryAfterSeconds / 60);
    return {
      error: `Demasiados envíos desde esta conexión. Probá de nuevo en ${min} ${min === 1 ? "minuto" : "minutos"}.`,
    };
  }

  const slug = str(formData, "slug");
  const dirigente = await getDirigentePorSlug(slug);
  if (!dirigente) {
    return { error: "El link ya no está disponible. Pedí uno nuevo a tu contacto." };
  }

  const nombre = str(formData, "nombre");
  if (nombre.length < 3) return { error: "Ingresá tu nombre y apellido." };

  const celular = str(formData, "celular");
  if (!celularValidoPY(celular)) {
    return { error: "Revisá tu celular — usá el formato 09xx xxx xxx." };
  }

  const barrio = str(formData, "barrio");
  if (barrio.length < 3) return { error: "Contanos tu barrio y ciudad." };

  const quiere_stickers = formData.get("quiere_stickers") === "on";
  const quiere_voluntario = formData.get("quiere_voluntario") === "on";
  if (!quiere_stickers && !quiere_voluntario) {
    return { error: "Marcá al menos una forma de apoyar." };
  }

  await crearApoyoPublico(dirigente, {
    nombre,
    telefono: normalizarCelular(celular),
    numero_cedula: str(formData, "cedula") || null,
    direccion: barrio,
    quiere_stickers,
    quiere_voluntario,
  });

  return { ok: true };
}
