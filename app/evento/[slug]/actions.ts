"use server";

import { getEventoPorSlug, inscribirEnEvento } from "@/lib/eventos";
import { celularValidoPY, normalizarCelular } from "@/lib/celular";
import { checkRateLimit, hashIp, type RateRule } from "@/lib/rate-limit";
import { ipDelCliente } from "@/lib/ip-cliente";

export type InscripcionState =
  | { error: string }
  | { ok: true; yaInscripto: boolean }
  | null;

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) || "").trim();
}

// Mismas ventanas que "Quiero apoyar": holgadas porque en un acto mucha gente
// comparte la IP pública del NAT de la operadora.
const REGLAS_INSCRIPCION: RateRule[] = [
  { limit: 8, windowSeconds: 60 },
  { limit: 40, windowSeconds: 60 * 30 },
];

/**
 * Inscripción pública a un evento — sin sesión. El evento (y por lo tanto el
 * candidato al que se suma el votante) se re-resuelve por slug en el server;
 * nunca se confía en datos del cliente. Anti-spam: honeypot + rate limit por IP.
 */
export async function inscribirse(
  _prev: InscripcionState,
  formData: FormData,
): Promise<InscripcionState> {
  // Honeypot lleno → bot: simulamos éxito sin escribir nada.
  if (str(formData, "apodo_confirmacion")) return { ok: true, yaInscripto: false };

  const limite = await checkRateLimit(
    `evento:${hashIp(await ipDelCliente())}`,
    REGLAS_INSCRIPCION,
  );
  if (!limite.ok) {
    const min = Math.ceil(limite.retryAfterSeconds / 60);
    return {
      error: `Demasiados envíos desde esta conexión. Probá de nuevo en ${min} ${min === 1 ? "minuto" : "minutos"}.`,
    };
  }

  const evento = await getEventoPorSlug(str(formData, "slug"));
  if (!evento) return { error: "Este evento ya no está disponible." };

  const nombre = str(formData, "nombre");
  if (nombre.length < 3 || nombre.length > 120) {
    return { error: "Ingresá tu nombre y apellido." };
  }

  const cedula = str(formData, "cedula").replace(/\D/g, "");
  if (cedula.length < 4 || cedula.length > 9) {
    return { error: "Revisá tu número de cédula." };
  }

  const sexo = str(formData, "sexo");
  if (sexo !== "F" && sexo !== "M") return { error: "Elegí tu sexo." };

  const edadTexto = str(formData, "edad");
  const edad = Number(edadTexto);
  // Sin edad mínima a propósito: la base joven también se suma a los eventos.
  if (!/^\d{1,3}$/.test(edadTexto) || edad < 1 || edad > 110) {
    return { error: "Ingresá una edad válida." };
  }

  const ciudad = str(formData, "ciudad");
  if (ciudad.length < 2 || ciudad.length > 80) return { error: "Contanos tu ciudad." };

  const barrio = str(formData, "barrio");
  if (barrio.length < 2 || barrio.length > 80) return { error: "Contanos tu barrio." };

  const telefono = str(formData, "telefono");
  if (!celularValidoPY(telefono)) {
    return { error: "Revisá tu teléfono — usá el formato 09xx xxx xxx." };
  }

  const { yaInscripto } = await inscribirEnEvento(evento, {
    nombre,
    numero_cedula: cedula,
    genero: sexo,
    edad,
    ciudad,
    barrio,
    telefono: normalizarCelular(telefono),
  });

  return { ok: true, yaInscripto };
}
