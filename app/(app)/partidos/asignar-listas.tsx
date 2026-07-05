"use client";

import { asignarListasAction } from "./actions";
import type { IntendenteConListas } from "@/lib/partidos";
import type { Lista } from "@/lib/types";

/**
 * Un intendente + checkboxes de todas las listas de la campaña, precargados con
 * las que ya tiene. Al guardar, reemplaza el conjunto (setListasDeIntendente).
 */
export function AsignarListas({
  intendente,
  listas,
}: {
  intendente: IntendenteConListas;
  listas: Lista[];
}) {
  const asignadas = new Set(intendente.listas.map((l) => l.id));

  return (
    <form action={asignarListasAction} className="card p-4">
      <input type="hidden" name="intendente_id" value={intendente.id} />
      <p className="font-semibold text-slate-900">{intendente.nombre}</p>
      {intendente.email && <p className="text-xs text-muted">{intendente.email}</p>}

      {listas.length === 0 ? (
        <p className="text-sm text-muted mt-3">
          No hay listas creadas todavía. Creá una arriba para poder asignarla.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {listas.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                name="lista_id"
                value={l.id}
                defaultChecked={asignadas.has(l.id)}
              />
              {l.partido_sigla} · {l.nombre}
              {l.numero ? ` (${l.numero})` : ""}
            </label>
          ))}
        </div>
      )}

      <button type="submit" className="btn-primary mt-4 w-full sm:w-auto">
        Guardar listas
      </button>
    </form>
  );
}
