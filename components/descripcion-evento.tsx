"use client";

import { useState } from "react";
import { recortarDescripcion } from "@/lib/eventos-config";

/**
 * Descripción de un evento, colapsable: muestra un recorte y alterna con
 * "Saber más" / "Saber menos". La usan la página pública del evento y la
 * pantalla interna del evento.
 */
export function DescripcionEvento({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const recorte = recortarDescripcion(texto);

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line break-words">
        {abierta || !recorte ? texto : recorte}
      </p>
      {recorte && (
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="mt-1 min-h-[var(--touch-min)] text-sm font-semibold text-brand-600 hover:underline"
        >
          {abierta ? "Saber menos" : "Saber más"}
        </button>
      )}
    </div>
  );
}
