import "server-only";

// Consulta al padrón electoral del TSJE (https://padron.tsje.gov.py/, consulta
// RCP). Desde julio 2026 el sitio no exige reCAPTCHA (quedó comentado en su
// HTML) y el WAF de Sucuri acepta el POST server-to-server, así que la consulta
// es directa. La respuesta es HTML: se parsea con los dos marcadores conocidos
// (ficha con inputs disabled = inscripto; "NO TIENE NINGUNA INSCRIPCIÓN" = no
// inscripto). Si el sitio vuelve a poner captcha o cambia el HTML, tiramos
// PadronError y la UI cae al modo de carga manual.

export interface PadronConsulta {
  cedula: string;
  dia: number;
  mes: number;
  anio: number;
}

export interface PadronResult {
  // ¿La cédula figura en el padrón? (el TSJE también responde "no" si la fecha
  // de nacimiento no coincide con la cédula)
  encontrado: boolean;
  // ¿Está habilitada para votar? (sólo tiene sentido si encontrado = true)
  habilitado: boolean;
  nombre: string | null;
  distrito: string | null;
  departamento: string | null;
  zona: string | null;
  local: string | null;
}

export class PadronError extends Error {}

const PADRON_URL = "https://padron.tsje.gov.py/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const NO_ENCONTRADO: PadronResult = {
  encontrado: false,
  habilitado: false,
  nombre: null,
  distrito: null,
  departamento: null,
  zona: null,
  local: null,
};

export async function consultarPadron(q: PadronConsulta): Promise<PadronResult> {
  const cedula = q.cedula.trim();
  if (!cedula) return NO_ENCONTRADO;

  const body = new FormData();
  body.set("cedula", cedula);
  body.set("dia", String(q.dia));
  body.set("mes", String(q.mes));
  body.set("anio", String(q.anio));
  body.set("buscar", "si");

  let res: Response;
  try {
    res = await fetch(PADRON_URL, {
      method: "POST",
      body,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new PadronError("No se pudo conectar con el TSJE", { cause: e });
  }
  if (!res.ok) throw new PadronError(`El TSJE respondió ${res.status}`);

  // El HTML trae bloques enteros comentados (incluida una versión vieja del
  // formulario y el aviso de captcha); se descartan antes de parsear.
  const html = (await res.text()).replace(/<!--[\s\S]*?-->/g, "");

  if (/NO<\/span>\s*TIENE NINGUNA INSCRIPCI/i.test(html)) return NO_ENCONTRADO;

  // Ficha del inscripto: 5 inputs disabled en orden fijo
  // (nombre, departamento, distrito, zona, local).
  const valores = [...html.matchAll(/<input[^>]*\bdisabled\b[^>]*\bvalue="([^"]*)"/g)]
    .map((m) => m[1].trim());
  if (valores.length >= 5 && valores[0]) {
    const [nombre, departamento, distrito, zona, local] = valores;
    return {
      encontrado: true,
      habilitado: true,
      nombre,
      departamento: departamento || null,
      distrito: distrito || null,
      zona: zona || null,
      local: local || null,
    };
  }

  throw new PadronError("Respuesta del TSJE no reconocida (¿volvió el captcha?)");
}
