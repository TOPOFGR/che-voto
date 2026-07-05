"use client";

import { useActionState } from "react";
import { actualizarVotante } from "./actions";
import { VotanteCampos } from "../votante-campos";
import type { VotanteDetalle } from "@/lib/queries";

export function EditarVotanteForm({ votante }: { votante: VotanteDetalle }) {
  const [state, formAction, isPending] = useActionState(actualizarVotante, null);

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4">
      <input type="hidden" name="id" value={votante.id} />

      <VotanteCampos
        initial={{
          nombre: votante.nombre,
          numero_cedula: votante.numero_cedula,
          fecha_nacimiento: votante.fecha_nacimiento,
          telefono: votante.telefono,
          precisa_transporte: votante.precisa_transporte,
          direccion: votante.direccion,
          intencion_partido: votante.intencion_partido,
          habilitado: votante.habilitado,
          padron_distrito: votante.padron_distrito,
          padron_departamento: votante.padron_departamento,
          padron_zona: votante.padron_zona,
          padron_local: votante.padron_local,
          lat: votante.lat,
          lng: votante.lng,
        }}
      />

      {/* Seguimiento del día de la elección (GOTV). */}
      <fieldset className="rounded-xl border border-[var(--color-line)] p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Día de la elección
        </legend>
        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="voto" defaultChecked={votante.estado_voto === "voto"} />
            Votó
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="fue_buscado" defaultChecked={votante.fue_buscado} />
            Se lo fue a buscar
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="agradecido" defaultChecked={votante.agradecido} />
            Se le agradeció por votar
          </label>
        </div>
      </fieldset>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
