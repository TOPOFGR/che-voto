import "server-only";
import { createHash } from "node:crypto";
import sql from "@/lib/db";

// Salteamos el hash de la IP para no guardar la IP cruda (privacidad) y para que
// no sea trivial revertir el hash. Reusa el secreto de sesión si está.
const SALT =
  process.env.RATE_LIMIT_SALT ||
  process.env.NEON_AUTH_COOKIE_SECRET ||
  "chevoto-rate-limit";

/** sha256 salteado de la IP; lo que guardamos como clave del contador. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex");
}

export interface RateRule {
  /** Máximo de eventos permitidos dentro de la ventana. */
  limit: number;
  /** Largo de la ventana en segundos. */
  windowSeconds: number;
}

export interface RateResult {
  ok: boolean;
  /** Segundos hasta que se libere (0 si ok). */
  retryAfterSeconds: number;
}

/**
 * Rate limiter de ventana fija, atómico y respaldado en Postgres (sirve en
 * serverless / multi-instancia, a diferencia de un Map en memoria). Cada regla
 * usa su propia clave `${baseKey}:${windowSeconds}`; el upsert incrementa el
 * contador y lo reinicia cuando la ventana venció (`reset_at < now()`). Devuelve
 * ok=false apenas UNA regla se pasa. Se cuentan también los intentos rechazados,
 * así una ráfaga sigue bloqueada hasta que la ventana expire.
 */
export async function checkRateLimit(
  baseKey: string,
  rules: RateRule[],
): Promise<RateResult> {
  for (const rule of rules) {
    const key = `${baseKey}:${rule.windowSeconds}`;
    const [row] = await sql<{ count: number; reset_at: string }[]>`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + ${rule.windowSeconds} * interval '1 second')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < now() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < now()
            THEN now() + ${rule.windowSeconds} * interval '1 second'
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `;
    if (row.count > rule.limit) {
      const retry = Math.max(
        1,
        Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000),
      );
      return { ok: false, retryAfterSeconds: retry };
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}
