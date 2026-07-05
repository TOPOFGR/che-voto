"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export interface ResetState {
  error?: string;
}

/** Set a new password using the token from the emailed reset link. */
export async function restablecerPassword(
  _prev: ResetState | null,
  formData: FormData,
): Promise<ResetState> {
  const token = ((formData.get("token") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const confirmar = (formData.get("confirmar") as string) || "";

  if (!token) return { error: "Falta el token de recuperación. Abrí el enlace del correo de nuevo." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmar) return { error: "Las contraseñas no coinciden." };

  const { error } = await auth.resetPassword({ newPassword: password, token });
  if (error) {
    return {
      error:
        error.message ||
        "El enlace venció o no es válido. Pedí uno nuevo desde “Recuperar contraseña”.",
    };
  }
  redirect("/auth/sign-in?reset=1");
}
