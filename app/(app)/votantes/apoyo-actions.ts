"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import { actualizarLinkApoyo } from "@/lib/queries";

export type LinkApoyoState =
  | { ok: true; slug: string }
  | { error: string }
  | null;

/**
 * Guarda el "nombre a mostrar" del link "Quiero apoyar" del usuario y regenera
 * su slug. Revalida /votantes para que la tarjeta refleje el nuevo link.
 */
export async function guardarLinkApoyo(
  _prev: LinkApoyoState,
  formData: FormData,
): Promise<LinkApoyoState> {
  const usuario = await requireUsuario();
  const apoyoNombre = ((formData.get("apoyo_nombre") as string) || "").trim();

  const res = await actualizarLinkApoyo(usuario, apoyoNombre);
  if (!res.ok) return { error: res.error };

  revalidatePath("/votantes");
  return { ok: true, slug: res.slug };
}
