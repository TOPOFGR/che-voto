import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import sql from "@/lib/db";
import type { Usuario } from "@/lib/types";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const { data: session } = await auth.getSession();
  return (session?.user as SessionUser) ?? null;
}

/**
 * Resolve the app-level `usuarios` row for the currently authenticated person.
 * Links a freshly authenticated account to a pre-existing `usuarios` row by
 * email the first time it is seen. Returns null when the account has no
 * matching `usuarios` row yet (i.e. it still needs onboarding).
 */
export async function getCurrentUsuario(): Promise<Usuario | null> {
  const su = await getSessionUser();
  if (!su) return null;

  const byAuth = await sql<Usuario[]>`
    SELECT u.*, c.nombre AS campaign_nombre
    FROM usuarios u
    JOIN campaigns c ON c.id = u.campaign_id
    WHERE u.auth_provider_id = ${su.id}
    LIMIT 1
  `;
  if (byAuth.length) return byAuth[0];

  // First login for this account: adopt an unlinked usuarios row with the same email.
  if (su.email) {
    const linked = await sql<Usuario[]>`
      UPDATE usuarios u
      SET auth_provider_id = ${su.id}, updated_at = now()
      FROM campaigns c
      WHERE u.campaign_id = c.id
        AND lower(u.email) = lower(${su.email})
        AND u.auth_provider_id IS NULL
      RETURNING u.*, c.nombre AS campaign_nombre
    `;
    if (linked.length) return linked[0];
  }

  return null;
}

/** Require an onboarded usuario or redirect. Use at the top of protected pages. */
export async function requireUsuario(): Promise<Usuario> {
  const su = await getSessionUser();
  if (!su) redirect("/auth/sign-in");
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/onboarding");
  return usuario;
}
