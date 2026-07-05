"use client";

import { useActionState, useState } from "react";
import { invitarMiembro, revocarInvitacionAction, type InvitarState } from "./actions";
import { ROLES, type RolUsuario } from "@/lib/types";
import type { InvitacionPendiente } from "@/lib/invitaciones";

function linkDe(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invitacion/${token}`;
}

function CopiarLink({ token, className = "" }: { token: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(linkDe(token));
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          /* clipboard bloqueado: el usuario puede copiar a mano */
        }
      }}
      className={`btn-ghost ${className}`}
    >
      {copiado ? "¡Copiado!" : "Copiar link"}
    </button>
  );
}

export function InvitarPanel({
  rolesDisponibles,
  pendientes,
}: {
  rolesDisponibles: RolUsuario[];
  pendientes: InvitacionPendiente[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, isPending] = useActionState<InvitarState | null, FormData>(
    invitarMiembro,
    null,
  );

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Invitar integrantes</p>
          <p className="text-xs text-muted">
            Generá un link de invitación para sumar a alguien con un rol por debajo del tuyo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="btn-primary shrink-0"
        >
          {abierto ? "Cerrar" : "Nueva invitación"}
        </button>
      </div>

      {abierto && (
        <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-[var(--color-line)] pt-4">
          <div className="sm:col-span-1">
            <label htmlFor="inv-rol" className="label">Rol *</label>
            <select id="inv-rol" name="rol" required className="field" defaultValue={rolesDisponibles[0]}>
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>{ROLES[r].label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="inv-nombre" className="label">
              Nombre <span className="text-muted font-normal">(opcional)</span>
            </label>
            <input id="inv-nombre" name="nombre" className="field" placeholder="Juana Pérez" />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="inv-email" className="label">
              Email <span className="text-muted font-normal">(opcional)</span>
            </label>
            <input id="inv-email" name="email" type="email" className="field" placeholder="juana@correo.com" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" disabled={isPending} className="btn-primary w-full sm:w-auto">
              {isPending ? "Generando…" : "Generar link"}
            </button>
          </div>
        </form>
      )}

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{state.error}</p>
      )}

      {state?.token && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">
            Invitación creada{state.rol ? ` como ${ROLES[state.rol].label}` : ""}. Compartí este link:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs bg-white rounded-lg px-3 py-2 border border-emerald-200">
              {linkDe(state.token)}
            </code>
            <CopiarLink token={state.token} />
          </div>
          <p className="text-xs text-emerald-700 mt-2">
            Quien abra el link crea su cuenta y queda con el rol asignado. Vence en 14 días.
          </p>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            Invitaciones pendientes ({pendientes.length})
          </p>
          <ul className="flex flex-col gap-2">
            {pendientes.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">
                    <span className="font-medium">{inv.rol_label}</span>
                    {inv.nombre ? ` · ${inv.nombre}` : ""}
                    {inv.email ? ` · ${inv.email}` : ""}
                  </p>
                  <p className="text-xs text-muted truncate">Invitó {inv.invitado_por}</p>
                </div>
                <CopiarLink token={inv.token} className="shrink-0" />
                <form action={revocarInvitacionAction} className="shrink-0">
                  <input type="hidden" name="id" value={inv.id} />
                  <button type="submit" className="btn-ghost text-red-600" title="Revocar invitación">
                    Revocar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
