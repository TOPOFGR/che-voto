"use client";

import { useActionState, useState } from "react";
import { enviarApoyo, type ApoyoState } from "./actions";
import { celularValidoPY } from "@/lib/celular";

export function ApoyoForm({
  slug,
  dirigenteNombre,
}: {
  slug: string;
  dirigenteNombre: string;
}) {
  const [state, formAction, isPending] = useActionState<ApoyoState, FormData>(
    enviarApoyo,
    null,
  );

  // Campos controlados para poder mostrar errores por campo al intentar enviar
  // (espeja el prototipo .dc.html). El server valida igual, como fuente de verdad.
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [cedula, setCedula] = useState("");
  const [barrio, setBarrio] = useState("");
  const [quiereStickers, setQuiereStickers] = useState(false);
  const [quiereVoluntario, setQuiereVoluntario] = useState(false);
  const [intento, setIntento] = useState(false);
  // El resultado {ok:true} de la action manda la pantalla de gracias; `dismiss`
  // permite volver al form ("Cargar otra persona") sin un effect que sincronice.
  const [dismiss, setDismiss] = useState(false);
  const mostrarGracias = !!state && "ok" in state && !dismiss;

  const errNombre = intento && nombre.trim().length < 3;
  const errCelular = intento && !celularValidoPY(celular);
  const errBarrio = intento && barrio.trim().length < 3;
  const errApoyo = intento && !quiereStickers && !quiereVoluntario;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setIntento(true);
    setDismiss(false);
    const invalido =
      nombre.trim().length < 3 ||
      !celularValidoPY(celular) ||
      barrio.trim().length < 3 ||
      (!quiereStickers && !quiereVoluntario);
    if (invalido) e.preventDefault();
  }

  function otroRegistro() {
    setNombre("");
    setCelular("");
    setCedula("");
    setBarrio("");
    setQuiereStickers(false);
    setQuiereVoluntario(false);
    setIntento(false);
    setDismiss(true);
  }

  if (mostrarGracias) {
    return (
      <div className="flex flex-col items-center gap-5 text-center py-10">
        <div className="w-24 h-24 rounded-full bg-brand-500 text-white flex items-center justify-center text-5xl leading-none">
          ✓
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold text-ink">¡Muchas gracias!</h2>
          <p className="text-slate-700">Nos vamos a contactar cuanto antes.</p>
          <p className="text-sm text-muted">
            Ya sos parte del equipo de {dirigenteNombre}.
          </p>
        </div>
        <button type="button" onClick={otroRegistro} className="btn-ghost">
          Cargar otra persona
        </button>
      </div>
    );
  }

  const errClass = "mt-1.5 text-xs font-medium text-accent-700";

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="card p-5 flex flex-col gap-4"
    >
      <input type="hidden" name="slug" value={slug} />

      {/* Honeypot anti-bots: invisible y fuera del tab-order para humanos; los
          bots que llenan todo lo completan y quedan marcados en el server. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="ap-apodo-confirmacion">No completar</label>
        <input
          id="ap-apodo-confirmacion"
          type="text"
          name="apodo_confirmacion"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="ap-nombre" className="label">
          Nombre y apellido *
        </label>
        <input
          id="ap-nombre"
          name="nombre"
          className="field"
          placeholder="Ej: María González"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={errNombre}
        />
        {errNombre && <p className={errClass}>✕ Ingresá tu nombre y apellido</p>}
      </div>

      <div>
        <label htmlFor="ap-celular" className="label">
          Celular *
        </label>
        <input
          id="ap-celular"
          name="celular"
          type="tel"
          inputMode="tel"
          className="field"
          placeholder="09xx xxx xxx"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          aria-invalid={errCelular}
        />
        {errCelular ? (
          <p className={errClass}>✕ Celular inválido — usá el formato 09xx xxx xxx</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">Formato paraguayo: empieza con 09</p>
        )}
      </div>

      <div>
        <label htmlFor="ap-cedula" className="label">
          Cédula <span className="text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="ap-cedula"
          name="cedula"
          inputMode="numeric"
          className="field"
          placeholder="Ej: 4.123.456"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="ap-barrio" className="label">
          Barrio y ciudad *
        </label>
        <input
          id="ap-barrio"
          name="barrio"
          className="field"
          placeholder="Ej: San Vicente, Asunción"
          value={barrio}
          onChange={(e) => setBarrio(e.target.value)}
          aria-invalid={errBarrio}
        />
        {errBarrio && <p className={errClass}>✕ Contanos tu barrio y ciudad</p>}
      </div>

      <div className="border-t border-[var(--color-line)] pt-4">
        <p className="text-sm font-medium text-slate-700 mb-2">
          ¿Cómo querés apoyar?{" "}
          <span className="text-muted font-normal">(elegí al menos una)</span>
        </p>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm text-slate-700">
          <input
            type="checkbox"
            name="quiere_stickers"
            className="w-5 h-5 accent-[var(--color-brand-500)]"
            checked={quiereStickers}
            onChange={(e) => setQuiereStickers(e.target.checked)}
          />
          Quiero los stickers de {dirigenteNombre}
        </label>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm text-slate-700">
          <input
            type="checkbox"
            name="quiere_voluntario"
            className="w-5 h-5 accent-[var(--color-brand-500)]"
            checked={quiereVoluntario}
            onChange={(e) => setQuiereVoluntario(e.target.checked)}
          />
          Quiero apoyar como voluntario/a
        </label>
        {errApoyo && <p className={errClass}>✕ Marcá al menos una opción</p>}
      </div>

      {state && "error" in state && (
        <p className="alert-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full min-h-[var(--touch-lg)] text-base"
      >
        {isPending ? "Enviando…" : "Quiero apoyar"}
      </button>
      <p className="text-center text-xs text-muted">
        Tus datos se usan solo para la campaña. No los compartimos.
      </p>
    </form>
  );
}
