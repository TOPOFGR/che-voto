"use client";

import { useRef, useState } from "react";

// "YYYY-MM-DD" → "DD/MM/YYYY" para mostrar al usuario.
function isoADisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// "DD/MM/YYYY" completo y válido → "YYYY-MM-DD"; si no, "".
function displayAIso(v: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  const fecha = new Date(y, mo - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() !== mo - 1 || fecha.getDate() !== d) {
    return "";
  }
  return `${yyyy}-${mm}-${dd}`;
}

// Inserta las barras a medida que se tipea: hasta 8 dígitos → DD/MM/YYYY.
function enmascarar(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "/" + d.slice(2, 4);
  if (d.length > 4) out += "/" + d.slice(4, 8);
  return out;
}

/**
 * Campo de fecha que SIEMPRE se muestra en DD/MM/YYYY (independiente del locale
 * del navegador, que el <input type="date"> nativo no deja controlar), pero
 * conserva el calendario nativo: un <input type="date"> transparente superpuesto
 * al ícono abre el date picker del dispositivo. El valor se envía como YYYY-MM-DD
 * en un input oculto con el `name` dado.
 */
export function FechaInput({
  id,
  name,
  defaultISO,
  required,
  onChangeISO,
}: {
  id?: string;
  name: string;
  defaultISO?: string | null;
  required?: boolean;
  // Notifica al padre cada vez que hay una fecha completa válida ("" si no).
  onChangeISO?: (iso: string) => void;
}) {
  const [iso, setIsoState] = useState(defaultISO ?? "");
  const setIso = (v: string) => {
    setIsoState(v);
    onChangeISO?.(v);
  };
  const dateRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(isoADisplay(defaultISO ?? ""));
  const invalida = texto.length === 10 && !iso;

  function onTexto(v: string) {
    const masked = enmascarar(v);
    setTexto(masked);
    setIso(displayAIso(masked));
  }

  function abrirCalendario() {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* showPicker requiere gesto/visibilidad; caemos al focus/click */
      }
    }
    el.focus();
    el.click();
  }

  return (
    <>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          className="field pr-11"
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          required={required}
          aria-invalid={invalida || undefined}
        />
        {/* Botón visible (ícono) para abrir el calendario nativo. */}
        <button
          type="button"
          onClick={abrirCalendario}
          aria-label="Abrir calendario"
          className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-500 hover:text-slate-700"
        >
          📅
        </button>
        {/* Date picker nativo oculto (no muestra su formato según locale); el
            botón de arriba lo abre con showPicker(). */}
        <input
          ref={dateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={iso}
          onChange={(e) => {
            setIso(e.target.value);
            setTexto(isoADisplay(e.target.value));
          }}
          className="sr-only"
        />
      </div>
      {invalida && <p className="text-xs text-accent-700 mt-1">Fecha inválida.</p>}
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
