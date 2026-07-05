"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import {
  crearLista,
  crearPartido,
  setListasDeIntendente,
} from "@/lib/partidos";
import type { Usuario } from "@/lib/types";

async function requireAdmin(): Promise<Usuario> {
  const usuario = await requireUsuario();
  if (usuario.rol !== "administrador") {
    throw new Error("Solo el administrador puede gestionar partidos y listas.");
  }
  return usuario;
}

export interface FormState {
  error?: string;
  ok?: boolean;
}

export async function crearPartidoAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireAdmin();
  const nombre = ((formData.get("nombre") as string) || "").trim();
  const sigla = ((formData.get("sigla") as string) || "").trim().toUpperCase();
  if (!nombre || !sigla) return { error: "Nombre y sigla son obligatorios." };

  await crearPartido(usuario.campaign_id, { nombre, sigla });
  revalidatePath("/partidos");
  return { ok: true };
}

export async function crearListaAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const usuario = await requireAdmin();
  const partido_id = ((formData.get("partido_id") as string) || "").trim();
  const nombre = ((formData.get("nombre") as string) || "").trim();
  const numero = ((formData.get("numero") as string) || "").trim() || null;
  if (!partido_id) return { error: "Elegí un partido." };
  if (!nombre) return { error: "El nombre de la lista es obligatorio." };

  await crearLista(usuario.campaign_id, { partido_id, nombre, numero });
  revalidatePath("/partidos");
  return { ok: true };
}

export async function asignarListasAction(formData: FormData) {
  await requireAdmin();
  const intendenteId = ((formData.get("intendente_id") as string) || "").trim();
  if (!intendenteId) return;
  const listaIds = formData.getAll("lista_id").map((v) => String(v)).filter(Boolean);

  await setListasDeIntendente(intendenteId, listaIds);
  revalidatePath("/partidos");
  revalidatePath("/organigrama");
}
