"use client";

import { useState } from "react";
import { ROLES } from "@/lib/types";
import type { CargadorWebOpcion } from "@/lib/queries";

/**
 * "Cargador de votantes con IA" del inicio. Muestra un curl listo para copiar
 * que crea un votante (origen "web") vía POST /api/votantes/web/<slug>, y un
 * prompt para pegarle al LLM del usuario así le arma el formulario en su web.
 * El administrador elige para quién es el cargador (a quién quedan asignados
 * los votantes); el resto sólo tiene el propio. La URL usa
 * window.location.origin (como MiLinkApoyo) y sólo se arma con la ventana
 * abierta, así no hay desajuste de hidratación.
 */
export function CargadorWeb({ opciones }: { opciones: CargadorWebOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState(opciones[0]?.id ?? "");
  const [copiado, setCopiado] = useState<"curl" | "prompt" | null>(null);

  const opcion = opciones.find((o) => o.id === elegido) ?? opciones[0];
  if (!opcion) return null;

  const esAdmin = opciones.length > 1;
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${origen}/api/votantes/web/${opcion.slug}`;

  const curl = [
    `curl -X POST "${endpoint}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"nombre":"Juan Pérez","telefono":"0981123456","cedula":"1234567","barrio":"San Vicente","ciudad":"Asunción"}'`,
  ].join("\n");

  const prompt = `Agregá a mi sitio web un formulario "Quiero sumarme" que registre a cada persona en mi CRM de campaña (CheVoto). Este curl muestra la llamada:

${curl}

Requisitos:
- Hacé el envío con fetch (POST, Content-Type: application/json) desde el navegador; el endpoint acepta CORS desde cualquier dominio y no necesita API key.
- Campos: "nombre" (obligatorio, nombre y apellido), "telefono" (celular paraguayo 09xx xxx xxx) y "cedula" (solo números): opcionales, pero mandá al menos uno de los dos; "barrio" y "ciudad" (opcionales).
- Respuestas: 201 {"ok":true} = listo, mostrá un mensaje de gracias; 400/404 {"ok":false,"error":"..."} = mostrá el texto de "error"; 429 = demasiados envíos, pedí que prueben más tarde.
- Deshabilitá el botón mientras se envía para evitar envíos duplicados.
- Que respete el diseño actual de mi web y se vea bien en celular.`;

  async function copiar(texto: string, cual: "curl" | "prompt") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* clipboard bloqueado: el usuario puede copiar a mano */
    }
  }

  return (
    <div className="card p-4 mt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            Cargador de votantes para tu web{" "}
            <span className="chip bg-brand-100 text-brand-700 ml-1 align-middle">IA</span>
          </p>
          <p className="text-xs text-muted">
            Sumá un formulario a tu página: cada persona que lo complete entra como votante.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="btn-ghost shrink-0"
        >
          {abierto ? "Cerrar" : "Ver cómo"}
        </button>
      </div>

      {abierto && (
        <div className="mt-4 border-t border-[var(--color-line)] pt-4 flex flex-col gap-4">
          <ol className="flex flex-col gap-2 text-sm text-slate-700">
            <li>
              <b>1.</b> Copiá el código de abajo.
            </li>
            <li>
              <b>2.</b> Pegáselo a tu IA (ChatGPT, Claude, Gemini…) y decile:{" "}
              <i>“Agregá a mi web un formulario que mande los datos con este curl”</i>.
            </li>
            <li>
              <b>3.</b> Listo: quienes se anoten en tu web aparecen en Votantes como{" "}
              <span className="chip bg-brand-100 text-brand-700">Se sumó por la web</span>.
            </li>
          </ol>

          {esAdmin && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cargador-para" className="label">
                ¿Para quién es el cargador?
              </label>
              <select
                id="cargador-para"
                className="field"
                value={opcion.id}
                onChange={(e) => setElegido(e.target.value)}
              >
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} · {ROLES[o.rol].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">
                Los votantes que entren por este cargador quedan asignados a {opcion.nombre}.
              </p>
            </div>
          )}

          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-100">
            <code>{curl}</code>
          </pre>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copiar(curl, "curl")} className="btn-primary">
              {copiado === "curl" ? "Copiado ✓" : "Copiar curl"}
            </button>
            <button type="button" onClick={() => copiar(prompt, "prompt")} className="btn-ghost">
              {copiado === "prompt" ? "Copiado ✓" : "Copiar prompt completo para tu IA"}
            </button>
          </div>

          <p className="text-xs text-muted">
            Obligatorios: <b>nombre</b> y al menos uno entre <b>telefono</b> (09xx xxx xxx) y{" "}
            <b>cedula</b>. Opcionales: barrio y ciudad. Por seguridad, cada conexión puede cargar
            hasta 5 votantes por minuto y 30 por hora.
          </p>
        </div>
      )}
    </div>
  );
}
