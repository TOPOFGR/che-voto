"use server";

import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { createVotante } from "@/lib/queries";
import {
  ETAPAS,
  INTENCIONES,
  type EtapaEmbudo,
  type IntencionVoto,
} from "@/lib/types";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function cargarVotante(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const usuario = await requireUsuario();
  if (usuario.rol === "analista") {
    return { error: "Tu rol no permite cargar votantes." };
  }

  const nombre = ((formData.get("nombre") as string) || "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };

  const etapa = formData.get("etapa") as EtapaEmbudo;
  const intencion = formData.get("intencion") as IntencionVoto;
  if (!(etapa in ETAPAS)) return { error: "Etapa inválida." };
  if (!(intencion in INTENCIONES)) return { error: "Intención inválida." };

  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));

  await createVotante(usuario, {
    nombre,
    apellido: ((formData.get("apellido") as string) || "").trim() || null,
    numero_cedula: ((formData.get("numero_cedula") as string) || "").trim() || null,
    telefono: ((formData.get("telefono") as string) || "").trim() || null,
    direccion: ((formData.get("direccion") as string) || "").trim() || null,
    genero: ((formData.get("genero") as string) || "").trim() || null,
    fecha_nacimiento: ((formData.get("fecha_nacimiento") as string) || "").trim() || null,
    territorio_id: ((formData.get("territorio_id") as string) || "").trim() || null,
    etapa,
    intencion,
    lat,
    lng,
  });

  redirect("/votantes");
}
