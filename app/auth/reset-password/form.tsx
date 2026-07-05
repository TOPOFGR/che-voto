"use client";

import { useActionState } from "react";
import { restablecerPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(restablecerPassword, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="label">
          Nueva contraseña
        </label>
        <input id="password" name="password" type="password" required minLength={8}
          autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="field" />
      </div>
      <div>
        <label htmlFor="confirmar" className="label">
          Repetir contraseña
        </label>
        <input id="confirmar" name="confirmar" type="password" required minLength={8}
          autoComplete="new-password" placeholder="Repetí la contraseña" className="field" />
      </div>

      {state?.error && (
        <p className="alert-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full mt-1">
        {isPending ? "Guardando…" : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
