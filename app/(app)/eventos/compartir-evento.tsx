"use client";

import { useState } from "react";

/**
 * Link público de inscripción del evento. La URL completa se arma al copiar o
 * compartir con window.location.origin (sirve en cualquier host sin env var).
 */
export function CompartirEvento({ slug, nombre }: { slug: string; nombre: string }) {
  const [copiado, setCopiado] = useState(false);
  const path = `/evento/${slug}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard bloqueado: el usuario puede abrir el link y copiarlo a mano */
    }
  }

  function compartirWhatsapp() {
    const texto = `${nombre} — inscribite acá: ${window.location.origin}${path}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="card p-4 mb-4 flex flex-col gap-3">
      <div>
        <p className="font-semibold text-slate-900">Link de inscripción</p>
        <p className="text-xs text-muted">
          Quien se inscriba entra como votante tuyo. No hace falta iniciar sesión.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--color-line)] bg-slate-50 px-3.5 py-2.5">
        <span className="block truncate text-sm font-semibold text-brand-700">{path}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copiar} className="btn-primary">
          {copiado ? "Link copiado ✓" : "Copiar link"}
        </button>
        <button type="button" onClick={compartirWhatsapp} className="btn-ghost">
          Compartir por WhatsApp
        </button>
        <a href={path} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          Abrir ↗
        </a>
      </div>
    </div>
  );
}
