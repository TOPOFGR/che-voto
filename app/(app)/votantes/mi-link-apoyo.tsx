"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/lib/slug";
import { guardarLinkApoyo, type LinkApoyoState } from "./apoyo-actions";

/**
 * Generador del link público "Quiero apoyar" en la pantalla de votantes.
 * El dirigente elige su "nombre a mostrar" (p.ej. "Jaz Concejal") y de ahí sale
 * el slug del link (jaz-concejal), el encabezado y los stickers. La URL se arma
 * con window.location.origin (igual que organigrama/invitar) para funcionar en
 * cualquier host sin variable de entorno.
 */
export function MiLinkApoyo({
  slug,
  apoyoNombre,
}: {
  slug: string;
  apoyoNombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [nombre, setNombre] = useState(apoyoNombre);
  const [state, formAction, isPending] = useActionState<LinkApoyoState, FormData>(
    guardarLinkApoyo,
    null,
  );

  // Slug efectivo: el recién guardado manda; si no, el que vino del server.
  const slugEfectivo = state && "ok" in state ? state.slug : slug;
  const previewSlug = slugify(nombre) || "tu-nombre";
  const sinGuardar = previewSlug !== slugEfectivo;

  const path = `/apoyar/${slugEfectivo}`;
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard bloqueado: el usuario puede copiar a mano */
    }
  }

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Mi link para sumar apoyos</p>
          <p className="text-xs text-muted">
            Compartilo por WhatsApp o redes. Cada persona que lo complete entra a tu padrón.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="btn-ghost shrink-0"
        >
          {abierto ? "Cerrar" : "Ver link"}
        </button>
      </div>

      {abierto && (
        <div className="mt-4 border-t border-[var(--color-line)] pt-4 flex flex-col gap-4">
          {/* Personalizá el nombre a mostrar → slug */}
          <form action={formAction} className="flex flex-col gap-2">
            <label htmlFor="apoyo-nombre" className="label">
              Nombre a mostrar
            </label>
            <input
              id="apoyo-nombre"
              name="apoyo_nombre"
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Jaz Concejal"
            />
            <p className="text-xs text-muted">
              Aparece en el encabezado, en los stickers y en el link:{" "}
              <span className="font-medium text-brand-700">/apoyar/{previewSlug}</span>
            </p>
            {state && "error" in state && (
              <p className="alert-danger">{state.error}</p>
            )}
            <div>
              <button
                type="submit"
                disabled={isPending || !sinGuardar}
                className="btn-primary"
              >
                {isPending
                  ? "Guardando…"
                  : state && "ok" in state && !sinGuardar
                    ? "Guardado ✓"
                    : "Guardar nombre"}
              </button>
            </div>
          </form>

          {/* Link vigente */}
          <div className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-4">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-slate-50 px-3.5 py-2.5">
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-brand-700">
                {url}
              </span>
            </div>
            {sinGuardar && (
              <p className="text-xs text-accent-700">
                Guardá el nombre para que el link use <b>/apoyar/{previewSlug}</b>. Se
                copia el link vigente de arriba.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copiar} className="btn-primary">
                {copiado ? "Link copiado ✓" : "Copiar link"}
              </button>
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Abrir ↗
              </a>
            </div>
            <p className="text-xs text-muted">
              El formulario no pide iniciar sesión — cualquiera con el link puede sumarse.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
