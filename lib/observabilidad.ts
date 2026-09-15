import "server-only";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import sql from "@/lib/db";

/**
 * Traza de los formularios públicos (hoy, la inscripción a eventos).
 *
 * Son endpoints sin sesión donde el que falla no puede avisarnos: si algo sale
 * mal, la persona cierra la página y se pierde. Cada envío deja dos rastros:
 *
 *  1. Una línea JSON en stdout — la captura el runtime del host (Vercel), sirve
 *     para alertas y es lo primero que se mira. Nunca lleva datos personales.
 *  2. Una fila en `inscripcion_intentos` — consultable con SQL meses después, y
 *     con los datos del formulario cuando NO quedaron guardados, para poder
 *     recuperar a mano al votante perdido.
 *
 * Reglas de esta capa: no rompe nunca (un fallo al registrar no puede tumbar una
 * inscripción) y no bloquea la respuesta (la escritura va en `after()`).
 */

export type ResultadoIntento =
  /** Se inscribió (mirar `yaInscripto` para saber si ya estaba). */
  | "ok"
  /** No pasó la validación del server. `motivo` = campo. */
  | "validacion"
  /** Cortado por el rate limit de la IP. */
  | "rate_limit"
  /** Honeypot lleno. Se le mostró éxito y no se guardó nada. */
  | "honeypot"
  /** El slug no resolvió a ningún evento. */
  | "link_invalido"
  /** Excepción inesperada (casi siempre, la DB). */
  | "error";

/** Campos planos tal como llegaron del formulario. */
export type PayloadFormulario = Record<string, string | number | boolean | null>;

export interface Intento {
  origen: "evento" | "apoyo";
  resultado: ResultadoIntento;
  /** Código corto que también ve la persona cuando falla. */
  codigo: string;
  slug?: string | null;
  motivo?: string | null;
  eventoId?: string | null;
  personaId?: string | null;
  /** false = se reusó una persona ya cargada y sus datos se descartaron. */
  personaNueva?: boolean | null;
  yaInscripto?: boolean | null;
  /** Cuántos reintentos hicieron falta por errores de conexión (0 = ninguno). */
  reintentos?: number | null;
  ipHash?: string | null;
  userAgent?: string | null;
  duracionMs?: number | null;
  /** Datos del form. Pasarlos SÓLO si no quedaron persistidos. */
  payload?: PayloadFormulario | null;
}

/**
 * Código de 6 caracteres sin vocales ni símbolos ambiguos (0/O, 1/I): se lo
 * mostramos a la persona cuando el envío falla y lo dicta por WhatsApp.
 */
export function nuevoCodigo(): string {
  const alfabeto = "23456789BCDFGHJKLMNPQRSTVWXZ";
  const bytes = randomBytes(6);
  let codigo = "";
  for (const b of bytes) codigo += alfabeto[b % alfabeto.length];
  return codigo;
}

/**
 * Registra un intento. Sincrónica a propósito: quien la llama no espera nada,
 * así no suma latencia al formulario.
 */
export function registrarIntento(intento: Intento): void {
  emitirLinea(intento);
  programar(() => persistir(intento));
}

/**
 * Igual que `registrarIntento`, pero esperable. Para quien corre fuera del ciclo
 * de una request y tiene que garantizar la escritura antes de terminar — hoy,
 * `onRequestError` en `instrumentation.ts`.
 */
export async function registrarIntentoEsperando(intento: Intento): Promise<void> {
  emitirLinea(intento);
  await persistir(intento);
}

/** Línea JSON a stdout. Primero, porque sobrevive aunque la DB sea lo que falla. */
function emitirLinea(intento: Intento): void {
  // Sin datos personales: el payload va sólo a la tabla.
  const linea = {
    evt: "inscripcion",
    origen: intento.origen,
    resultado: intento.resultado,
    codigo: intento.codigo,
    motivo: intento.motivo ?? undefined,
    slug: intento.slug ?? undefined,
    evento_id: intento.eventoId ?? undefined,
    persona_nueva: intento.personaNueva ?? undefined,
    ya_inscripto: intento.yaInscripto ?? undefined,
    reintentos: intento.reintentos || undefined,
    duracion_ms: intento.duracionMs ?? undefined,
  };
  if (intento.resultado === "error") console.error(JSON.stringify(linea));
  else console.log(JSON.stringify(linea));
}

/** Corre la escritura después de responder, sin bloquear el formulario. */
function programar(tarea: () => Promise<void>): void {
  try {
    after(tarea);
  } catch {
    // `after` exige el ciclo de una request; fuera de él (p. ej. onRequestError
    // en algunos runtimes) la disparamos suelta.
    void tarea();
  }
}

async function persistir(i: Intento): Promise<void> {
  try {
    await sql`
      INSERT INTO inscripcion_intentos
        (origen, codigo, resultado, motivo, slug, evento_id, persona_id,
         persona_nueva, ya_inscripto, reintentos, ip_hash, user_agent, duracion_ms,
         payload)
      VALUES
        (${i.origen}, ${i.codigo}, ${i.resultado}, ${i.motivo ?? null},
         ${i.slug ?? null}, ${i.eventoId ?? null}, ${i.personaId ?? null},
         ${i.personaNueva ?? null}, ${i.yaInscripto ?? null}, ${i.reintentos ?? null},
         ${i.ipHash ?? null},
         ${i.userAgent?.slice(0, 300) ?? null}, ${i.duracionMs ?? null},
         ${i.payload ? sql.json(i.payload) : null})
    `;
  } catch (e) {
    // Si ni el registro se puede escribir, al menos queda en stdout.
    console.error(
      JSON.stringify({
        evt: "inscripcion_log_fallido",
        codigo: i.codigo,
        error: mensajeError(e),
      }),
    );
  }
}

/** Mensaje corto y sin secretos de un error desconocido. */
export function mensajeError(e: unknown): string {
  if (e instanceof Error) {
    const causa = e.cause instanceof Error ? ` (${e.cause.message})` : "";
    return `${e.name}: ${e.message}${causa}`.slice(0, 500);
  }
  return String(e).slice(0, 500);
}
