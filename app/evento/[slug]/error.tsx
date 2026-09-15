"use client";

import { useEffect } from "react";
import { ChevotoMark } from "@/components/icons";

/**
 * Error boundary de la página pública del evento. Sin esto, cualquier excepción
 * al renderizar (la DB que no responde, por ejemplo) le dejaba a la persona la
 * pantalla de error genérica de Next, sin forma de reintentar y sin que nosotros
 * nos enteráramos.
 *
 * El error del server ya quedó registrado en `onRequestError`
 * (`instrumentation.ts`); acá sólo mostramos el `digest`, que es la clave para
 * cruzarlo con esa traza.
 */
export default function ErrorEventoPublico({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16 text-center">
      <ChevotoMark className="w-14 h-14 mb-4" />
      <h1 className="text-xl font-extrabold text-slate-900">No pudimos cargar el evento</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Puede ser un problema momentáneo de conexión. Probá de nuevo.
      </p>
      <button type="button" onClick={() => unstable_retry()} className="btn-primary mt-5">
        Reintentar
      </button>
      {error.digest && <p className="mt-4 text-xs text-muted">Código: {error.digest}</p>}
    </main>
  );
}
