"use client";

import Link from "next/link";
import { useActionState } from "react";
import { solicitarReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(solicitarReset, null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (state?.sent) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xl mb-3 mx-auto">
          ✉
        </div>
        <h2 className="text-lg font-bold text-slate-900">Revisá tu correo</h2>
        <p className="text-sm text-muted mt-2">
          Si existe una cuenta con ese email, te enviamos un enlace para crear una
          nueva contraseña. Puede tardar unos minutos; revisá también el spam.
        </p>
        <Link href="/auth/sign-in" className="btn-ghost mt-4 inline-block">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Recuperar contraseña</h2>
      <p className="text-sm text-muted mb-5">
        Ingresá tu correo y te enviamos un enlace para restablecerla.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="origin" value={origin} />
        <div>
          <label htmlFor="email" className="label">
            Correo electrónico
          </label>
          <input id="email" name="email" type="email" required autoComplete="email"
            placeholder="tu@correo.com" className="field" />
        </div>

        {state?.error && (
          <p className="alert-danger">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full mt-1">
          {isPending ? "Enviando…" : "Enviarme el enlace"}
        </button>
      </form>

      <p className="text-sm text-muted text-center mt-5">
        <Link href="/auth/sign-in" className="font-semibold text-brand-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
