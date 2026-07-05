import "server-only";

// Consulta al padrón electoral. Hoy es un STUB: la fuente real es el TSJE
// (https://padron.tsje.gov.py/), que está detrás de Sucuri WAF + reCAPTCHA v2 y
// no admite una llamada server-to-server directa. La Fase 4 reemplaza
// `consultarPadron` por el adapter real (o un import del padrón a una tabla local)
// sin tocar la UI, que sólo depende de esta interfaz.

export interface PadronConsulta {
  cedula: string;
  dia: number;
  mes: number;
  anio: number;
}

export interface PadronResult {
  // ¿La cédula figura en el padrón?
  encontrado: boolean;
  // ¿Está habilitada para votar? (sólo tiene sentido si encontrado = true)
  habilitado: boolean;
  nombre: string | null;
  distrito: string | null;
  departamento: string | null;
  zona: string | null;
  local: string | null;
}

/**
 * STUB determinístico para desarrollo. Reglas para poder probar los dos caminos:
 * - cédula vacía o "0"           → no encontrado
 * - cédula termina en 0          → encontrado pero NO habilitado
 * - resto                        → habilitado, con datos de ejemplo de Asunción
 */
export async function consultarPadron(q: PadronConsulta): Promise<PadronResult> {
  const cedula = q.cedula.trim();
  const noEncontrado: PadronResult = {
    encontrado: false,
    habilitado: false,
    nombre: null,
    distrito: null,
    departamento: null,
    zona: null,
    local: null,
  };

  if (!cedula || cedula === "0") return noEncontrado;

  const habilitado = !cedula.endsWith("0");
  return {
    encontrado: true,
    habilitado,
    nombre: null,
    departamento: "CAPITAL",
    distrito: "ASUNCIÓN",
    zona: "ZONA " + ((Number(cedula.slice(-1)) % 9) + 1),
    local: "ESC. BÁSICA N° 123 REPÚBLICA DEL PARAGUAY",
  };
}
