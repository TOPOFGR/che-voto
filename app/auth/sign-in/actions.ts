"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { mensajeAuthError } from "@/lib/auth/errores";

// Only allow same-site relative redirects to avoid open-redirect abuse.
function safeNext(next: FormDataEntryValue | null): string {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const { error } = await auth.signIn.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: mensajeAuthError(error, "No se pudo iniciar sesión. Intentá de nuevo.") };
  }
  redirect(safeNext(formData.get("next")));
}
