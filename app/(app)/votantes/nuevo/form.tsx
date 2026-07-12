"use client";

import { useActionState } from "react";
import { cargarVotante } from "./actions";
import { VotanteCampos } from "../votante-campos";

export function NuevoVotanteForm() {
  const [state, formAction, isPending] = useActionState(cargarVotante, null);

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4">
      <VotanteCampos colapsable />

      {state?.error && (
        <p className="alert-danger">{state.error}</p>
      )}

      {/* En mobile el botón queda pegado abajo (por encima del tab bar) y siempre
          a la vista; en desktop vuelve al flujo normal al pie del formulario. */}
      <div className="sticky z-20 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] -mx-5 -mb-5 mt-1 border-t border-[var(--color-line)] bg-white/95 px-5 py-4 backdrop-blur md:static md:bottom-auto md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? "Guardando…" : "Guardar votante"}
        </button>
      </div>
    </form>
  );
}
