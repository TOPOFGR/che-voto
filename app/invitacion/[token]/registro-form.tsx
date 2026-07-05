"use client";

import { useActionState } from "react";
import { registrarDesdeInvitacion } from "./actions";

export function RegistroInvitacionForm({
  token,
  defaultEmail,
  defaultNombre,
}: {
  token: string;
  defaultEmail: string;
  defaultNombre: string;
}) {
  const [state, formAction, isPending] = useActionState(registrarDesdeInvitacion, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="nombre" className="label">Nombre y apellido</label>
        <input id="nombre" name="nombre" type="text" required autoComplete="name"
          defaultValue={defaultNombre} placeholder="Juana Pérez" className="field" />
      </div>
      <div>
        <label htmlFor="email" className="label">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email"
          defaultValue={defaultEmail} placeholder="tu@correo.com" className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8}
          autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="field" />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full mt-1">
        {isPending ? "Creando cuenta…" : "Crear cuenta y unirme"}
      </button>
    </form>
  );
}
