"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { INTENCIONES_PARTIDO, type IntencionPartido } from "@/lib/types";

export function Filtros() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.replace(`/votantes?${sp.toString()}`));
  }

  // Debounce free-text search.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update({ q });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="card p-3 mb-4 flex flex-col gap-2.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, cédula o teléfono…"
        className="field"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <select
          className="field"
          value={params.get("intencion") ?? ""}
          onChange={(e) => update({ intencion: e.target.value })}
        >
          <option value="">Toda intención</option>
          {(Object.keys(INTENCIONES_PARTIDO) as IntencionPartido[]).map((i) => (
            <option key={i} value={i}>{INTENCIONES_PARTIDO[i]}</option>
          ))}
        </select>
        <select
          className="field"
          value={params.get("habilitado") ?? ""}
          onChange={(e) => update({ habilitado: e.target.value })}
        >
          <option value="">Habilitación (todas)</option>
          <option value="si">Habilitado</option>
          <option value="no">No habilitado</option>
        </select>
      </div>
    </div>
  );
}
