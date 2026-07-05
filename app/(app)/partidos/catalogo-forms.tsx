"use client";

import { useActionState } from "react";
import { crearListaAction, crearPartidoAction, type FormState } from "./actions";
import type { Partido } from "@/lib/types";

export function NuevoPartidoForm() {
  const [state, action, isPending] = useActionState<FormState | null, FormData>(
    crearPartidoAction,
    null,
  );
  return (
    <form action={action} className="card p-4">
      <p className="font-semibold text-slate-900 mb-3">Nuevo partido</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="p-nombre" className="label">Nombre *</label>
          <input id="p-nombre" name="nombre" required className="field" placeholder="Partido Patria Querida" />
        </div>
        <div>
          <label htmlFor="p-sigla" className="label">Sigla *</label>
          <input id="p-sigla" name="sigla" required className="field" placeholder="PPQ" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-accent-700 mt-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700 mt-2">Partido creado.</p>}
      <button type="submit" disabled={isPending} className="btn-primary mt-3 w-full sm:w-auto">
        {isPending ? "Guardando…" : "Agregar partido"}
      </button>
    </form>
  );
}

export function NuevaListaForm({ partidos }: { partidos: Partido[] }) {
  const [state, action, isPending] = useActionState<FormState | null, FormData>(
    crearListaAction,
    null,
  );
  return (
    <form action={action} className="card p-4">
      <p className="font-semibold text-slate-900 mb-3">Nueva lista</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="l-partido" className="label">Partido *</label>
          <select id="l-partido" name="partido_id" required className="field" defaultValue={partidos[0]?.id ?? ""}>
            {partidos.map((p) => (
              <option key={p.id} value={p.id}>{p.sigla}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="l-nombre" className="label">Nombre *</label>
          <input id="l-nombre" name="nombre" required className="field" placeholder="Lista 1" />
        </div>
        <div>
          <label htmlFor="l-numero" className="label">
            Número <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input id="l-numero" name="numero" className="field" placeholder="1" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-accent-700 mt-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700 mt-2">Lista creada.</p>}
      <button type="submit" disabled={isPending || partidos.length === 0} className="btn-primary mt-3 w-full sm:w-auto">
        {isPending ? "Guardando…" : "Agregar lista"}
      </button>
    </form>
  );
}
