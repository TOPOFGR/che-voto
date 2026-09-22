import { timingSafeEqual } from "node:crypto";
import { conReintentos } from "@/lib/db";
import { contextoCliente } from "@/lib/ip-cliente";
import {
  extraerListaVotantes,
  MAX_VOTANTES_POR_REQUEST,
  parseVotanteLanding,
} from "@/lib/landing-jazmin-payload";
import {
  crearVotanteLandingSiNuevo,
  getDirigenteJazminGaleano,
} from "@/lib/landing-jazmin";
import {
  mensajeError,
  nuevoCodigo,
  registrarIntento,
  type Intento,
  type PayloadFormulario,
} from "@/lib/observabilidad";
import { checkRateLimit, hashIp, type RateRule } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const REGLAS: RateRule[] = [
  { limit: 8, windowSeconds: 60 },
  { limit: 40, windowSeconds: 60 * 30 },
];

type ResultadoFila =
  | { status: "created"; personaId: string }
  | { status: "skipped"; personaId: string }
  | { status: "invalid"; error: string };

function origenesPermitidos(): string[] {
  return (process.env.LANDING_JAZMIN_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(req: Request): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  headers.set("Vary", "Origin");

  const origin = req.headers.get("origin");
  const allowed = origenesPermitidos();
  if (origin && (allowed.includes("*") || allowed.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function json(
  req: Request,
  body: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  const headers = corsHeaders(req);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function apiKeyValida(req: Request): boolean {
  const esperada = process.env.LANDING_JAZMIN_API_KEY?.trim();
  if (!esperada) return true;

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const header = (req.headers.get("x-api-key") || "").trim();
  const enviada = bearer || header;
  if (!enviada) return false;

  const a = Buffer.from(enviada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * Alta pública de votantes para la landing de Jazmín Galeano. Sin sesión: el
 * referente se resuelve en el server. Si la persona ya existe (cédula, teléfono
 * o nombre), no se escribe nada. Spec de campos pendiente; hoy se guarda nombre
 * y, si vienen, cédula / teléfono / dirección.
 */
export async function POST(req: Request) {
  const inicio = Date.now();
  const codigo = nuevoCodigo();
  const { ip, userAgent } = await contextoCliente();

  const registrar = (detalle: Omit<Intento, "origen" | "codigo">) =>
    registrarIntento({
      origen: "landing_jazmin",
      codigo,
      slug: "jazmin-galeano",
      ipHash: hashIp(ip),
      userAgent,
      duracionMs: Date.now() - inicio,
      ...detalle,
    });

  try {
    const limite = await checkRateLimit(`landing-jazmin:${hashIp(ip)}`, REGLAS);
    if (!limite.ok) {
      const min = Math.ceil(limite.retryAfterSeconds / 60);
      registrar({
        resultado: "rate_limit",
        motivo: `retry_after=${limite.retryAfterSeconds}s`,
      });
      return json(
        req,
        {
          ok: false,
          error: `Demasiados envíos. Probá de nuevo en ${min} ${min === 1 ? "minuto" : "minutos"}.`,
        },
        429,
        { "Retry-After": String(limite.retryAfterSeconds) },
      );
    }

    if (!apiKeyValida(req)) {
      registrar({ resultado: "validacion", motivo: "api_key" });
      return json(req, { ok: false, error: "No autorizado." }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      registrar({ resultado: "validacion", motivo: "json" });
      return json(req, { ok: false, error: "El cuerpo tiene que ser JSON." }, 400);
    }

    const extraido = extraerListaVotantes(body);
    if (extraido.honeypot) {
      registrar({ resultado: "honeypot", payload: payloadSeguro(body) });
      return json(req, { ok: true, created: 0, skipped: 0, results: [] });
    }
    if (extraido.error) {
      registrar({ resultado: "validacion", motivo: extraido.error, payload: payloadSeguro(body) });
      return json(req, { ok: false, error: extraido.error }, 400);
    }
    if (extraido.items.length === 0) {
      registrar({ resultado: "validacion", motivo: "vacio" });
      return json(req, { ok: false, error: "No hay votantes para cargar." }, 400);
    }
    if (extraido.items.length > MAX_VOTANTES_POR_REQUEST) {
      registrar({
        resultado: "validacion",
        motivo: `lote>${MAX_VOTANTES_POR_REQUEST}`,
      });
      return json(
        req,
        {
          ok: false,
          error: `Mandá como máximo ${MAX_VOTANTES_POR_REQUEST} votantes por request.`,
        },
        400,
      );
    }

    const {
      valor: dirigente,
      reintentos: reintentosDirigente,
    } = await conReintentos(() => getDirigenteJazminGaleano());
    if (!dirigente) {
      registrar({ resultado: "link_invalido", reintentos: reintentosDirigente });
      return json(
        req,
        { ok: false, error: "La landing todavía no está vinculada a un usuario." },
        503,
      );
    }

    const results: ResultadoFila[] = [];
    let created = 0;
    let skipped = 0;
    let invalid = 0;
    let ultimaPersona: string | undefined;
    let personaNueva: boolean | undefined;
    let reintentos = reintentosDirigente;

    for (const item of extraido.items) {
      const parsed = parseVotanteLanding(item);
      if (!parsed.ok) {
        invalid += 1;
        results.push({ status: "invalid", error: parsed.error });
        continue;
      }

      const { valor, reintentos: r } = await conReintentos(() =>
        crearVotanteLandingSiNuevo(dirigente, parsed.data),
      );
      reintentos += r;
      ultimaPersona = valor.personaId;
      personaNueva = valor.creada;
      if (valor.creada) {
        created += 1;
        results.push({ status: "created", personaId: valor.personaId });
      } else {
        skipped += 1;
        results.push({ status: "skipped", personaId: valor.personaId });
      }
    }

    registrar({
      resultado: invalid && !created && !skipped ? "validacion" : "ok",
      motivo: invalid ? `invalid=${invalid}` : null,
      personaId: ultimaPersona ?? null,
      personaNueva: personaNueva ?? null,
      reintentos,
      payload: invalid ? payloadSeguro(body) : null,
    });

    if (!created && !skipped) {
      const primerError =
        results.find((r): r is Extract<ResultadoFila, { status: "invalid" }> => r.status === "invalid")
          ?.error ?? "No hay votantes para cargar.";
      return json(req, { ok: false, error: primerError, results }, 400);
    }

    return json(
      req,
      { ok: true, created, skipped, invalid, results },
      created && !skipped && !invalid ? 201 : 200,
    );
  } catch (e) {
    registrar({ resultado: "error", motivo: mensajeError(e), payload: null });
    return json(
      req,
      {
        ok: false,
        error:
          "No pudimos guardar los datos. Probá de nuevo en un momento.",
        codigo,
      },
      500,
    );
  }
}

function payloadSeguro(body: unknown): PayloadFormulario | null {
  if (!body || typeof body !== "object") return null;
  if (Array.isArray(body)) {
    return { cantidad: body.length };
  }
  const o = body as Record<string, unknown>;
  const out: PayloadFormulario = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "votantes" || k === "voters" || k === "data") continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v == null) {
      out[k] = null;
    }
  }
  return out;
}
