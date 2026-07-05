"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import {
  crearInvitacion,
  revocarInvitacion,
} from "@/lib/invitaciones";
import { rolesInvitables, type RolUsuario } from "@/lib/types";

export interface InvitarState {
  error?: string;
  token?: string;
  rol?: RolUsuario;
}

export async function invitarMiembro(
  _prev: InvitarState | null,
  formData: FormData,
): Promise<InvitarState> {
  const usuario = await requireUsuario();

  const rol = formData.get("rol") as RolUsuario;
  if (!rol || !rolesInvitables(usuario.rol).includes(rol)) {
    return { error: "Elegí un rol que puedas invitar." };
  }
  const email = ((formData.get("email") as string) || "").trim() || null;
  const nombre = ((formData.get("nombre") as string) || "").trim() || null;

  try {
    const inv = await crearInvitacion(usuario, { rol, email, nombre });
    revalidatePath("/organigrama");
    return { token: inv.token, rol };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la invitación." };
  }
}

export async function revocarInvitacionAction(formData: FormData) {
  const usuario = await requireUsuario();
  const id = formData.get("id") as string;
  if (id) {
    await revocarInvitacion(usuario, id);
    revalidatePath("/organigrama");
  }
}
