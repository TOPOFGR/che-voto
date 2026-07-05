"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithEmail } from "./actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="label">
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" required autoComplete="email"
          placeholder="tu@correo.com" className="field" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">
            Contraseña
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input id="password" name="password" type="password" required
          autoComplete="current-password" placeholder="••••••••" className="field" />
      </div>

      {state?.error && (
        <p className="alert-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full mt-1">
        {isPending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
