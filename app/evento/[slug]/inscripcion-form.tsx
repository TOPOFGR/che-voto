"use client";

import { useActionState, useState, useTransition } from "react";
import { inscribirse, type InscripcionState } from "./actions";
import { SEXOS, type Sexo } from "@/lib/eventos-config";

export function InscripcionForm({
  slug,
  eventoNombre,
  linkSaberMas,
}: {
  slug: string;
  eventoNombre: string;
  linkSaberMas: string | null;
}) {
  const [state, formAction, isPending] = useActionState<InscripcionState, FormData>(
    inscribirse,
    null,
  );
  // Dispatch en transición (no <form action>) para que un error del server no
  // resetee los campos ya completados.
  const [, startTransition] = useTransition();
  // `dismiss` vuelve al form desde la pantalla de éxito ("Inscribir a otra persona").
  const [dismiss, setDismiss] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const exito = !!state && "ok" in state && !dismiss;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDismiss(false);
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  function otraPersona() {
    setDismiss(true);
    setFormKey((k) => k + 1); // remonta el form vacío
  }

  if (exito && state && "ok" in state) {
    return (
      <div className="card p-6 flex flex-col items-center gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500 text-white flex items-center justify-center text-4xl leading-none">
          ✓
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold text-ink">
            {state.yaInscripto ? "¡Ya estabas inscripto/a!" : "¡Listo, ya estás inscripto/a!"}
          </h2>
          <p className="text-slate-700">Te esperamos en {eventoNombre}.</p>
        </div>

        {linkSaberMas && (
          <a
            href={linkSaberMas}
            target="_blank"
            rel="noopener noreferrer"
            className="w-28 h-28 rounded-full bg-brand-500 text-white flex items-center justify-center text-center text-base font-bold leading-tight hover:bg-brand-600 active:bg-brand-700 transition-colors"
            style={{ boxShadow: "var(--shadow-cta)" }}
          >
            Saber
            <br />
            más
          </a>
        )}

        <button type="button" onClick={otraPersona} className="btn-ghost">
          Inscribir a otra persona
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-ink">Inscribite al evento</h2>
        <p className="text-sm text-muted">Completá tus datos para participar.</p>
      </div>

      <input type="hidden" name="slug" value={slug} />

      {/* Honeypot anti-bots: invisible y fuera del tab-order para humanos. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="ins-apodo-confirmacion">No completar</label>
        <input
          id="ins-apodo-confirmacion"
          type="text"
          name="apodo_confirmacion"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="ins-nombre" className="label">Nombre y apellido *</label>
        <input
          id="ins-nombre"
          name="nombre"
          required
          minLength={3}
          maxLength={120}
          autoComplete="name"
          className="field"
          placeholder="Ej: María González"
        />
      </div>

      <div>
        <label htmlFor="ins-cedula" className="label">Número de cédula *</label>
        <input
          id="ins-cedula"
          name="cedula"
          required
          inputMode="numeric"
          maxLength={12}
          className="field"
          placeholder="Ej: 4123456"
        />
      </div>

      <fieldset>
        <legend className="label">Sexo *</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SEXOS) as Sexo[]).map((s) => (
            <label
              key={s}
              className="flex min-h-[var(--touch-min)] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] text-sm font-semibold text-slate-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700"
            >
              <input type="radio" name="sexo" value={s} required className="sr-only" />
              {SEXOS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="ins-edad" className="label">Edad *</label>
        <input
          id="ins-edad"
          name="edad"
          type="number"
          required
          min={1}
          max={110}
          inputMode="numeric"
          className="field"
          placeholder="Ej: 34"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ins-ciudad" className="label">Ciudad *</label>
          <input
            id="ins-ciudad"
            name="ciudad"
            required
            minLength={2}
            maxLength={80}
            className="field"
            placeholder="Ej: Asunción"
          />
        </div>
        <div>
          <label htmlFor="ins-barrio" className="label">Barrio *</label>
          <input
            id="ins-barrio"
            name="barrio"
            required
            minLength={2}
            maxLength={80}
            className="field"
            placeholder="Ej: San Vicente"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ins-telefono" className="label">Teléfono *</label>
        <input
          id="ins-telefono"
          name="telefono"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          className="field"
          placeholder="09xx xxx xxx"
        />
      </div>

      {state && "error" in state && (
        <div className="alert-danger">
          <p>{state.error}</p>
          {/* Código del intento: lo dicta por WhatsApp y con eso encontramos su
              fila en `inscripcion_intentos`. */}
          {state.codigo && (
            <p className="mt-1 text-xs opacity-80">Código: {state.codigo}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full min-h-[var(--touch-lg)] text-base"
      >
        {isPending ? "Enviando…" : "Inscribirme"}
      </button>
      <p className="text-center text-xs text-muted">
        Tus datos se usan solo para la campaña. No los compartimos.
      </p>
    </form>
  );
}
