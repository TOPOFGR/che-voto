import "server-only";
import { randomBytes } from "node:crypto";
import sql from "@/lib/db";
import { rolesInvitables, ROLES, type Invitacion, type RolUsuario, type Usuario } from "@/lib/types";

const EXPIRA_DIAS = 14;

export interface InvitacionDetalle extends Invitacion {
  campaign_nombre: string;
  invitado_por: string;
}

function nuevoToken(): string {
  // URL-safe, ~22 chars. Unpredictable enough for an invite link.
  return randomBytes(16).toString("base64url");
}

/**
 * Create an invitation. Enforces the hierarchy: `inviter` may only invite roles
 * strictly below their own. Returns the created row (its `token` builds the link).
 */
export async function crearInvitacion(
  inviter: Usuario,
  data: {
    rol: RolUsuario;
    email?: string | null;
    nombre?: string | null;
    superior_id?: string | null;
    lista_id?: string | null;
  },
): Promise<Invitacion> {
  if (!rolesInvitables(inviter.rol).includes(data.rol)) {
    throw new Error("No podés invitar a ese rol.");
  }
  const email = data.email?.trim().toLowerCase() || null;
  const nombre = data.nombre?.trim() || null;
  const superiorId = data.superior_id || null;
  const listaId = data.lista_id || null;

  const [row] = await sql<Invitacion[]>`
    INSERT INTO invitaciones
      (campaign_id, token, email, nombre, rol, invited_by, superior_id, lista_id, expires_at)
    VALUES
      (${inviter.campaign_id}, ${nuevoToken()}, ${email}, ${nombre}, ${data.rol},
       ${inviter.id}, ${superiorId}, ${listaId},
       now() + ${`${EXPIRA_DIAS} days`}::interval)
    RETURNING id, campaign_id, token, email, nombre, rol, invited_by,
              superior_id, lista_id, estado, accepted_by, expires_at, created_at
  `;
  return row;
}

/** Fetch a still-usable invitation by token (pending and not expired). */
export async function getInvitacionUsable(
  token: string,
): Promise<InvitacionDetalle | null> {
  const rows = await sql<InvitacionDetalle[]>`
    SELECT i.id, i.campaign_id, i.token, i.email, i.nombre, i.rol, i.invited_by,
           i.superior_id, i.lista_id,
           i.estado, i.accepted_by, i.expires_at, i.created_at,
           c.nombre AS campaign_nombre,
           u.nombre AS invitado_por
    FROM invitaciones i
    JOIN campaigns c ON c.id = i.campaign_id
    JOIN usuarios u ON u.id = i.invited_by
    WHERE i.token = ${token}
      AND i.estado = 'pendiente'
      AND (i.expires_at IS NULL OR i.expires_at > now())
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Accept an invitation for an authenticated account, creating its `usuarios`
 * row with the invited role. Idempotency + safety are enforced in one tx:
 * the invitation is flipped to 'aceptada' with a guarded UPDATE, so a double
 * submit or an already-used token can't create a second membership.
 */
export async function aceptarInvitacion(
  token: string,
  authUserId: string,
  fallbackNombre: string | null,
  email: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return sql.begin(async (tx) => {
    const [inv] = await tx<Invitacion[]>`
      UPDATE invitaciones
      SET estado = 'aceptada', updated_at = now()
      WHERE token = ${token}
        AND estado = 'pendiente'
        AND (expires_at IS NULL OR expires_at > now())
      RETURNING id, campaign_id, token, email, nombre, rol, invited_by,
                superior_id, lista_id, estado, accepted_by, expires_at, created_at
    `;
    if (!inv) return { ok: false as const, error: "La invitación no es válida o ya fue usada." };

    // Account already linked to a membership? Undo the flip and stop.
    const [ya] = await tx<{ id: string }[]>`
      SELECT id FROM usuarios WHERE auth_provider_id = ${authUserId} LIMIT 1
    `;
    if (ya) {
      throw Object.assign(new Error("ya_es_miembro"), { code: "ya_es_miembro" });
    }

    const nombre = (inv.nombre || fallbackNombre || "").trim() || "Sin nombre";
    // superior_id define la posición en la jerarquía (y la visibilidad hacia
    // arriba). Se toma el de la invitación (p.ej. el intendente elegido por el
    // admin para un concejal) y, si no hay, quien invitó. lista_id aplica al concejal.
    const superiorId = inv.superior_id ?? inv.invited_by;
    const [usuario] = await tx<{ id: string }[]>`
      INSERT INTO usuarios (campaign_id, auth_provider_id, nombre, email, rol, superior_id, lista_id, activo)
      VALUES (${inv.campaign_id}, ${authUserId}, ${nombre},
              ${email ?? inv.email}, ${inv.rol}, ${superiorId}, ${inv.lista_id ?? null}, true)
      RETURNING id
    `;
    await tx`
      UPDATE invitaciones SET accepted_by = ${usuario.id} WHERE id = ${inv.id}
    `;
    return { ok: true as const };
  }).catch((e: unknown) => {
    if (e && typeof e === "object" && "code" in e && e.code === "ya_es_miembro") {
      return { ok: false as const, error: "Tu cuenta ya pertenece a la campaña." };
    }
    throw e;
  });
}

export interface InvitacionPendiente {
  id: string;
  rol: RolUsuario;
  rol_label: string;
  email: string | null;
  nombre: string | null;
  token: string;
  invited_by: string;
  invitado_por: string;
  created_at: string;
  expires_at: string | null;
}

/** Pending invitations of the campaign, newest first. */
export async function getInvitacionesPendientes(
  campaignId: string,
): Promise<InvitacionPendiente[]> {
  const rows = await sql<Omit<InvitacionPendiente, "rol_label">[]>`
    SELECT i.id, i.rol, i.email, i.nombre, i.token, i.invited_by,
           u.nombre AS invitado_por, i.created_at, i.expires_at
    FROM invitaciones i
    JOIN usuarios u ON u.id = i.invited_by
    WHERE i.campaign_id = ${campaignId}
      AND i.estado = 'pendiente'
      AND (i.expires_at IS NULL OR i.expires_at > now())
    ORDER BY i.created_at DESC
  `;
  return rows.map((r) => ({ ...r, rol_label: ROLES[r.rol].label }));
}

/**
 * Revoke a pending invitation. Only someone who can invite that role may revoke
 * it (keeps the same hierarchy rule as creation), scoped to the campaign.
 */
export async function revocarInvitacion(
  actor: Usuario,
  invitacionId: string,
): Promise<void> {
  const [inv] = await sql<{ rol: RolUsuario }[]>`
    SELECT rol FROM invitaciones
    WHERE id = ${invitacionId} AND campaign_id = ${actor.campaign_id}
      AND estado = 'pendiente'
    LIMIT 1
  `;
  if (!inv) return;
  if (!rolesInvitables(actor.rol).includes(inv.rol)) {
    throw new Error("No podés revocar esta invitación.");
  }
  await sql`
    UPDATE invitaciones SET estado = 'revocada', updated_at = now()
    WHERE id = ${invitacionId} AND campaign_id = ${actor.campaign_id}
  `;
}
