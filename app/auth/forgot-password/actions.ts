"use server";

import { auth } from "@/lib/auth/server";

export interface ResetRequestState {
  error?: string;
  sent?: boolean;
}

/**
 * Ask Neon Auth to email a password-reset link. `redirectTo` is the page the
 * emailed link opens; Neon Auth appends `?token=…` to it. The origin comes from
 * the client so the link matches whatever host the user is on (and is a trusted
 * origin — same-site).
 */
export async function solicitarReset(
  _prev: ResetRequestState | null,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = ((formData.get("email") as string) || "").trim();
  const origin = ((formData.get("origin") as string) || "").trim();
  if (!email) return { error: "Ingresá tu correo electrónico." };

  const redirectTo =
    origin && origin.startsWith("http")
      ? `${origin}/auth/reset-password`
      : undefined;

  const { error } = await auth.requestPasswordReset({ email, redirectTo });
  if (error) {
    return {
      error:
        error.message ||
        "No pudimos enviar el correo. Revisá la dirección e intentá de nuevo.",
    };
  }
  return { sent: true };
}
