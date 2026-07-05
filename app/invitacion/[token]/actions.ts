"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { mensajeAuthError } from "@/lib/auth/errores";
import { getSessionUser } from "@/lib/session";
import { getInvitacionUsable, aceptarInvitacion } from "@/lib/invitaciones";

function invitePath(token: string, error?: string) {
  return `/invitacion/${token}${error ? `?e=${encodeURIComponent(error)}` : ""}`;
}

/**
 * Create an account from an invitation link, then bounce back to the invite
 * page (now authenticated) to accept it. Kept as two steps so we never read a
 * session cookie in the same request that sets it.
 */
export async function registrarDesdeInvitacion(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const token = (formData.get("token") as string) || "";
  const inv = await getInvitacionUsable(token);
  if (!inv) return { error: "La invitación no es válida o ya venció." };

  const name = ((formData.get("nombre") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  if (!name || !email || !password) return { error: "Completá todos los campos." };

  const { error } = await auth.signUp.email({ email, name, password });
  if (error) {
    return {
      error: mensajeAuthError(
        error,
        "No se pudo crear la cuenta. Si ya tenés una, iniciá sesión.",
      ),
    };
  }

  redirect(invitePath(token));
}

/** Accept an invitation for the currently authenticated account. */
export async function aceptarInvitacionAction(formData: FormData) {
  const token = (formData.get("token") as string) || "";

  const su = await getSessionUser();
  if (!su) redirect(`/auth/sign-in?next=${encodeURIComponent(invitePath(token))}`);

  const res = await aceptarInvitacion(token, su.id, su.name ?? null, su.email ?? null);
  if (!res.ok) redirect(invitePath(token, res.error));

  redirect("/");
}
