import { ipDelCliente } from "@/lib/ip-cliente";
import { getDirigentePorSlug, crearVotanteWeb } from "@/lib/queries";
import { celularValidoPY, normalizarCelular } from "@/lib/celular";
import { checkRateLimit, hashIp, type RateRule } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Cargador web: endpoint público que el dirigente embebe en su propia web (el
 * curl se copia desde el inicio de la app y se lo pasa a su LLM). Cada POST crea
 * un votante con `fuente_dato = 'web'` asignado al dueño del slug. Bajo `/api`,
 * así que queda fuera del matcher de `proxy.ts` (sin redirect a login).
 *
 * CORS abierto: lo llama un `fetch` desde el navegador en OTRO dominio (la web
 * del dirigente). No hay credenciales en juego — el único "secreto" es el slug,
 * que ya es público (/apoyar/<slug>) — así que `*` no expone nada.
 *
 * Anti-abuso: rate limit por IP respaldado en la DB (compartido entre
 * instancias), un tope de tamaño del body y validación estricta. Un DDoS
 * volumétrico real se ataja en el borde (WAF/firewall del host); esto frena el
 * abuso a nivel aplicación antes de tocar las tablas de votantes.
 */

// Más estrictas que "Quiero apoyar": acá no hay una pantalla nuestra delante y el
// endpoint es trivial de automatizar. Siguen holgadas para el NAT compartido de
// las operadoras de PY (muchos votantes reales detrás de una misma IP).
const REGLAS_WEB: RateRule[] = [
  { limit: 5, windowSeconds: 60 }, // 5 por minuto
  { limit: 30, windowSeconds: 60 * 60 }, // 30 por hora
];

const MAX_BODY_BYTES = 4 * 1024;
const MAX_CAMPO = 200;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...CORS, ...extra } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Acepta JSON o form-urlencoded/multipart; devuelve un mapa plano de strings. */
async function leerCampos(req: Request): Promise<Record<string, string> | null> {
  const texto = await req.text();
  if (texto.length > MAX_BODY_BYTES) return null;
  const tipo = req.headers.get("content-type") ?? "";
  try {
    if (tipo.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(texto));
    }
    const data: unknown = JSON.parse(texto);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const campos: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string" || typeof v === "number") campos[k] = String(v);
    }
    return campos;
  } catch {
    return null;
  }
}

function campo(campos: Record<string, string>, ...nombres: string[]): string {
  for (const n of nombres) {
    const v = campos[n]?.trim();
    if (v) return v.slice(0, MAX_CAMPO);
  }
  return "";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Rate limit por IP primero: una ráfaga no llega a parsear ni a consultar el slug.
  const limite = await checkRateLimit(`web:${hashIp(await ipDelCliente())}`, REGLAS_WEB);
  if (!limite.ok) {
    return json(
      { ok: false, error: "Demasiados envíos desde esta conexión. Probá de nuevo más tarde." },
      429,
      { "Retry-After": String(limite.retryAfterSeconds) },
    );
  }

  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BODY_BYTES) {
    return json({ ok: false, error: "El envío es demasiado grande." }, 413);
  }

  const { slug } = await params;
  const dirigente = await getDirigentePorSlug(slug);
  if (!dirigente) {
    return json({ ok: false, error: "Este cargador ya no está disponible." }, 404);
  }

  const campos = await leerCampos(req);
  if (!campos) {
    return json({ ok: false, error: "Mandá los datos como JSON." }, 400);
  }

  const nombre = campo(campos, "nombre");
  if (nombre.length < 3) {
    return json({ ok: false, error: "Ingresá tu nombre y apellido." }, 400);
  }

  // El celular es opcional (una web que consulta el padrón sólo tiene la
  // cédula), pero si viene tiene que ser válido.
  const telefono = campo(campos, "telefono", "celular");
  if (telefono && !celularValidoPY(telefono)) {
    return json({ ok: false, error: "Revisá tu celular — usá el formato 09xx xxx xxx." }, 400);
  }

  const cedula = campo(campos, "cedula", "numero_cedula").replace(/\D/g, "");
  if (cedula && (cedula.length < 4 || cedula.length > 9)) {
    return json({ ok: false, error: "Revisá tu número de cédula." }, 400);
  }

  // Sólo con el nombre no hay forma de contactar ni de reconocer a la persona.
  if (!telefono && !cedula) {
    return json({ ok: false, error: "Ingresá tu celular o tu número de cédula." }, 400);
  }

  await crearVotanteWeb(dirigente, {
    nombre,
    telefono: telefono ? normalizarCelular(telefono) : null,
    numero_cedula: cedula || null,
    barrio: campo(campos, "barrio") || null,
    ciudad: campo(campos, "ciudad") || null,
  });

  // Misma respuesta si la cédula ya existía: no revelamos quién está cargado.
  return json({ ok: true }, 201);
}
