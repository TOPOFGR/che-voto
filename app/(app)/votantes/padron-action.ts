"use server";

import { requireUsuario } from "@/lib/session";
import { consultarPadron, type PadronResult } from "@/lib/padron";

export type ConsultaPadronResponse =
  | { ok: true; result: PadronResult }
  | { ok: false; error: string };

/** Consulta el padrón del TSJE con cédula + fecha de nacimiento (ISO YYYY-MM-DD). */
export async function consultarPadronAction(
  cedula: string,
  fechaISO: string,
): Promise<ConsultaPadronResponse> {
  await requireUsuario();

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO);
  if (!cedula.trim() || !m) {
    return { ok: false, error: "Se necesitan la cédula y la fecha de nacimiento." };
  }

  try {
    const result = await consultarPadron({
      cedula,
      anio: Number(m[1]),
      mes: Number(m[2]),
      dia: Number(m[3]),
    });
    return { ok: true, result };
  } catch {
    return {
      ok: false,
      error: "No se pudo consultar el TSJE. Reintentá o cargá el dato manualmente.",
    };
  }
}
