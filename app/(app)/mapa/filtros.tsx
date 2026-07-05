"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ETAPAS, INTENCIONES, type EtapaEmbudo, type IntencionVoto } from "@/lib/types";

export function MapaFiltros() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`/mapa?${sp.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <select
        className="field"
        value={params.get("etapa") ?? ""}
        onChange={(e) => update("etapa", e.target.value)}
      >
        <option value="">Todas las etapas</option>
        {(Object.keys(ETAPAS) as EtapaEmbudo[]).map((e) => (
          <option key={e} value={e}>{ETAPAS[e].label}</option>
        ))}
      </select>
      <select
        className="field"
        value={params.get("intencion") ?? ""}
        onChange={(e) => update("intencion", e.target.value)}
      >
        <option value="">Toda intención</option>
        {(Object.keys(INTENCIONES) as IntencionVoto[]).map((i) => (
          <option key={i} value={i}>{INTENCIONES[i].label}</option>
        ))}
      </select>
    </div>
  );
}
