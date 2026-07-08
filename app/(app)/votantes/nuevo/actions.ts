"use server";

import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { createVotante } from "@/lib/queries";
import { INTENCIONES_PARTIDO, type IntencionPartido } from "@/lib/types";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) || "").trim();
}

/** "true" | "false" | "" (select de habilitación del padrón) → boolean | null */
function parseBool(v: FormDataEntryValue | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function cargarVotante(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const usuario = await requireUsuario();

  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };
  const numero_cedula = str(formData, "numero_cedula") || null;
  const fecha_nacimiento = str(formData, "fecha_nacimiento") || null;

  const intencion_partido = formData.get("intencion_partido") as IntencionPartido;
  if (!(intencion_partido in INTENCIONES_PARTIDO)) {
    return { error: "Elegí una intención de voto." };
  }

  const precisa_transporte = formData.get("precisa_transporte") === "on";
  const direccion = str(formData, "direccion") || null;
  if (precisa_transporte && !direccion) {
    return { error: "Si hay que pasar a buscarlo, la dirección es obligatoria." };
  }

  await createVotante(usuario, {
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
  });

  redirect("/votantes");
}
