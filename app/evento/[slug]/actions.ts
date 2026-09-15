"use server";

import { getEventoPorSlug, inscribirEnEvento } from "@/lib/eventos";
import { celularValidoPY, normalizarCelular } from "@/lib/celular";
import { checkRateLimit, hashIp, type RateRule } from "@/lib/rate-limit";
import { contextoCliente } from "@/lib/ip-cliente";
import {
  mensajeError,
  nuevoCodigo,
  registrarIntento,
  type Intento,
  type PayloadFormulario,
} from "@/lib/observabilidad";

export type InscripcionState =
  | { error: string; codigo?: string }
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
 *
 * Todo camino de salida queda registrado en `inscripcion_intentos` (ver
 * `lib/observabilidad.ts`): es un formulario sin sesión donde el que falla no
 * vuelve a avisarnos, así que el rastro lo tenemos que dejar nosotros. Los
 * caminos que descartan datos (honeypot, rate limit, validación, error, o una
 * cédula ya cargada) guardan además lo que la persona escribió, para poder
 * recuperarla a mano.
 */
export async function inscribirse(
  _prev: InscripcionState,
  formData: FormData,
): Promise<InscripcionState> {
  const inicio = Date.now();
  const codigo = nuevoCodigo();
  const slug = str(formData, "slug");
  const { ip, userAgent } = await contextoCliente();

  // Lo que la persona escribió, para poder rescatar una inscripción que no
  // quedó guardada. Sólo se adjunta en los caminos que descartan datos.
  const payload: PayloadFormulario = {
    nombre: str(formData, "nombre"),
    cedula: str(formData, "cedula"),
    sexo: str(formData, "sexo"),
    edad: str(formData, "edad"),
    ciudad: str(formData, "ciudad"),
    barrio: str(formData, "barrio"),
    telefono: str(formData, "telefono"),
  };

  const registrar = (detalle: Omit<Intento, "origen" | "codigo">) =>
    registrarIntento({
      origen: "evento",
      codigo,
      slug,
      ipHash: hashIp(ip),
      userAgent,
      duracionMs: Date.now() - inicio,
      ...detalle,
    });

  try {
    // Honeypot lleno → bot: simulamos éxito sin escribir nada. Queda registrado
    // con el user-agent: si empieza a aparecer gente real (el autocompletado de
    // algunos navegadores llena campos ocultos) lo vemos acá antes que en un
    // reclamo.
    if (str(formData, "apodo_confirmacion")) {
      registrar({ resultado: "honeypot", payload });
      return { ok: true, yaInscripto: false };
    }

    const limite = await checkRateLimit(`evento:${hashIp(ip)}`, REGLAS_INSCRIPCION);
    if (!limite.ok) {
      const min = Math.ceil(limite.retryAfterSeconds / 60);
      registrar({
        resultado: "rate_limit",
        motivo: `retry_after=${limite.retryAfterSeconds}s`,
        payload,
      });
      return {
        error: `Demasiados envíos desde esta conexión. Probá de nuevo en ${min} ${min === 1 ? "minuto" : "minutos"}.`,
      };
    }

    const evento = await getEventoPorSlug(slug);
    if (!evento) {
      registrar({ resultado: "link_invalido", payload });
      return { error: "Este evento ya no está disponible." };
    }

    /** Corta la validación dejando registrado qué campo falló. */
    const invalido = (campo: string, mensaje: string): InscripcionState => {
      registrar({
        resultado: "validacion",
        motivo: campo,
        eventoId: evento.id,
        payload,
      });
      return { error: mensaje };
    };

    const nombre = str(formData, "nombre");
    if (nombre.length < 3 || nombre.length > 120) {
      return invalido("nombre", "Ingresá tu nombre y apellido.");
    }

    const cedula = str(formData, "cedula").replace(/\D/g, "");
    if (cedula.length < 4 || cedula.length > 9) {
      return invalido("cedula", "Revisá tu número de cédula.");
    }

    const sexo = str(formData, "sexo");
    if (sexo !== "F" && sexo !== "M") return invalido("sexo", "Elegí tu sexo.");

    const edadTexto = str(formData, "edad");
    const edad = Number(edadTexto);
    // Sin edad mínima a propósito: la base joven también se suma a los eventos.
    if (!/^\d{1,3}$/.test(edadTexto) || edad < 1 || edad > 110) {
      return invalido("edad", "Ingresá una edad válida.");
    }

    const ciudad = str(formData, "ciudad");
    if (ciudad.length < 2 || ciudad.length > 80) {
      return invalido("ciudad", "Contanos tu ciudad.");
    }

    const barrio = str(formData, "barrio");
    if (barrio.length < 2 || barrio.length > 80) {
      return invalido("barrio", "Contanos tu barrio.");
    }

    const telefono = str(formData, "telefono");
    if (!celularValidoPY(telefono)) {
      return invalido("telefono", "Revisá tu teléfono — usá el formato 09xx xxx xxx.");
    }

    const { yaInscripto, personaId, personaNueva } = await inscribirEnEvento(evento, {
      nombre,
      numero_cedula: cedula,
      genero: sexo,
      edad,
      ciudad,
      barrio,
      telefono: normalizarCelular(telefono),
    });

    registrar({
      resultado: "ok",
      eventoId: evento.id,
      personaId,
      personaNueva,
      yaInscripto,
      // Si la cédula ya estaba cargada se reusó esa persona y estos datos se
      // descartaron: los guardamos para poder detectar la confusión.
      payload: personaNueva ? null : payload,
    });

    return { ok: true, yaInscripto };
  } catch (e) {
    // Antes esto tumbaba la página entera (la action no atajaba nada y no hay
    // error boundary en el árbol público): la persona veía una pantalla de error
    // y nosotros no nos enterábamos. Ahora vuelve como error del formulario, con
    // un código que puede dictarnos para encontrar su intento.
    registrar({ resultado: "error", motivo: mensajeError(e), payload });
    return {
      error:
        "No pudimos guardar tu inscripción. Probá de nuevo en un momento — si vuelve a fallar, avisale a quien te compartió el link.",
      codigo,
    };
  }
}
