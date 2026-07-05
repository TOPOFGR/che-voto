"use client";

import { useActionState } from "react";
import { cargarVotante } from "./actions";
import { VotanteCampos } from "../votante-campos";

export function NuevoVotanteForm() {
  const [state, formAction, isPending] = useActionState(cargarVotante, null);

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4">
      <VotanteCampos />

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Guardando…" : "Guardar votante"}
      </button>
    </form>
  );
}
