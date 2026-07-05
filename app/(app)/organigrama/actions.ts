"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import {
  crearInvitacion,
  revocarInvitacion,
} from "@/lib/invitaciones";
import { listaEsDeIntendente } from "@/lib/partidos";
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

  // Un concejal necesita un intendente (superior) y una lista de ese intendente.
  let superior_id: string | null = null;
  let lista_id: string | null = null;
  if (rol === "concejal") {
    superior_id =
      usuario.rol === "intendente"
        ? usuario.id
        : ((formData.get("superior_id") as string) || "").trim() || null;
    if (!superior_id) {
      return { error: "Elegí a qué intendente pertenece el concejal." };
    }
    lista_id = ((formData.get("lista_id") as string) || "").trim() || null;
    if (!lista_id) {
      return { error: "Elegí la lista del concejal." };
    }
    if (!(await listaEsDeIntendente(superior_id, lista_id))) {
      return { error: "La lista no corresponde a ese intendente." };
    }
  }

  try {
    const inv = await crearInvitacion(usuario, {
      rol,
      email,
      nombre,
      superior_id,
      lista_id,
    });
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
