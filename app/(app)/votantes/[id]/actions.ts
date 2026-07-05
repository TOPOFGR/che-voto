"use server";

import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { updateVotante } from "@/lib/queries";
import { INTENCIONES_PARTIDO, type IntencionPartido } from "@/lib/types";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) || "").trim();
}
function parseBool(v: FormDataEntryValue | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function actualizarVotante(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const usuario = await requireUsuario();
  const id = str(formData, "id");
  if (!id) return { error: "Falta el identificador del votante." };

  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };
  const numero_cedula = str(formData, "numero_cedula");
  if (!numero_cedula) return { error: "La cédula es obligatoria." };
  const fecha_nacimiento = str(formData, "fecha_nacimiento");
  if (!fecha_nacimiento) return { error: "La fecha de nacimiento es obligatoria." };

  const intencion_partido = formData.get("intencion_partido") as IntencionPartido;
  if (!(intencion_partido in INTENCIONES_PARTIDO)) {
    return { error: "Elegí una intención de voto." };
  }

  const precisa_transporte = formData.get("precisa_transporte") === "on";
  const direccion = str(formData, "direccion") || null;
  if (precisa_transporte && !direccion) {
    return { error: "Si hay que pasar a buscarlo, la dirección es obligatoria." };
  }

  const ok = await updateVotante(usuario, id, {
    nombre,
    numero_cedula,
    fecha_nacimiento,
    telefono: str(formData, "telefono") || null,
    precisa_transporte,
    direccion,
    intencion_partido,
    habilitado: parseBool(formData.get("habilitado")),
    padron_distrito: str(formData, "padron_distrito") || null,
    padron_departamento: str(formData, "padron_departamento") || null,
    padron_zona: str(formData, "padron_zona") || null,
    padron_local: str(formData, "padron_local") || null,
    lat: num(formData.get("lat")),
    lng: num(formData.get("lng")),
    // GOTV
    estado_voto: formData.get("voto") === "on" ? "voto" : "pendiente",
    fue_buscado: formData.get("fue_buscado") === "on",
    agradecido: formData.get("agradecido") === "on",
  });

  if (!ok) return { error: "No se encontró el votante o no tenés acceso." };
  redirect("/votantes");
}
