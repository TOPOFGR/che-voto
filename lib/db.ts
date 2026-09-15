import "server-only";
import postgres from "postgres";

// Neon is accessed through the pooled (pgbouncer) endpoint, which runs in
// transaction pooling mode. Prepared statements are disabled for that reason.
// A single client is cached on globalThis so Next.js hot-reload in dev does not
// open a new pool on every module reload.

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    ssl: "require",
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });
}

const sql = globalForDb.sql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export default sql;

/**
 * Códigos de error que significan "la conexión no estaba", no "la consulta está
 * mal": una suspensión del compute de Neon, un pool reciclado, un corte de red.
 * Son los que justifican reintentar.
 */
const CODIGOS_TRANSITORIOS = new Set([
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "CONNECTION_REFUSED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
]);

export function esErrorTransitorio(e: unknown): boolean {
  const codigo =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code?: unknown }).code)
      : "";
  return CODIGOS_TRANSITORIOS.has(codigo);
}

/**
 * Corre una operación de base reintentándola ante un error de conexión. Pensada
 * para el formulario público: perder una inscripción porque el compute estaba
 * suspendido le cuesta a la campaña un votante, y a la persona, todo lo que
 * escribió.
 *
 * Sólo para operaciones idempotentes. La inscripción lo es: corre dentro de una
 * transacción (si falla no queda nada a medias) y sus INSERT usan ON CONFLICT, así
 * que si el primer intento llegó a comitear y se cortó la respuesta, el reintento
 * la reconoce como "ya inscripta" en vez de duplicarla.
 */
export async function conReintentos<T>(
  tarea: () => Promise<T>,
  esperas: number[] = [250, 1000],
): Promise<{ valor: T; reintentos: number }> {
  for (let i = 0; ; i++) {
    try {
      return { valor: await tarea(), reintentos: i };
    } catch (e) {
      if (i >= esperas.length || !esErrorTransitorio(e)) throw e;
      await new Promise((r) => setTimeout(r, esperas[i]));
    }
  }
}
