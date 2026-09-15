"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { actualizarPerfil } from "./actions";
import { redimensionarImagen } from "@/lib/redimensionar-imagen";
import type { Usuario } from "@/lib/types";

const MAX_LADO = 400; // px — lado máximo de la foto que se sube.

export function PerfilForm({ usuario }: { usuario: Usuario }) {
  const [state, formAction, isPending] = useActionState(actualizarPerfil, null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [eliminar, setEliminar] = useState(false);
  const [prevOk, setPrevOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Al confirmar el guardado, soltamos el preview local para que el avatar pase
  // a mostrar la foto ya persistida. Reset en render (patrón recomendado por
  // React para ajustar estado ante un cambio), no en un efecto. El object URL
  // anterior lo revoca el cleanup effect de abajo al cambiar `previewUrl`.
  if (!!state?.ok !== prevOk) {
    setPrevOk(!!state?.ok);
    if (state?.ok) {
      setPreviewUrl(null);
      setEliminar(false);
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    let archivo = original;
    try {
      archivo = await redimensionarImagen(original, MAX_LADO);
    } catch {
      // Si el redimensionado falla, subimos el original (el server valida
      // tamaño y tipo de todas formas).
    }

    // Reemplazamos el contenido del input por la versión redimensionada para
    // que sea eso lo que viaja en el submit.
    const dt = new DataTransfer();
    dt.items.add(archivo);
    e.target.files = dt.files;

    setEliminar(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(archivo);
    });
  }

  function handleQuitar() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
    setEliminar(true);
  }

  const mostrarFoto = eliminar ? null : usuario.foto_updated_at;

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4">
      <input type="hidden" name="eliminar_foto" value={eliminar ? "1" : "0"} />

      {/* Foto */}
      <div className="flex items-center gap-4">
        <Avatar
          id={usuario.id}
          nombre={usuario.nombre}
          fotoUpdatedAt={mostrarFoto}
          previewSrc={previewUrl}
          size={80}
        />
        <div className="flex flex-col gap-2">
          <label className="btn-ghost cursor-pointer w-fit">
            Cambiar foto
            <input
              ref={fileRef}
              type="file"
              name="foto"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePick}
              className="hidden"
            />
          </label>
          {(usuario.foto_updated_at || previewUrl) && !eliminar && (
            <button
              type="button"
              onClick={handleQuitar}
              className="text-sm text-accent-700 hover:underline w-fit"
            >
              Quitar foto
            </button>
          )}
          {eliminar && (
            <p className="text-xs text-muted">Se quitará la foto al guardar.</p>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label htmlFor="nombre" className="label">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          className="field"
          placeholder="Nombre y apellido"
          defaultValue={usuario.nombre}
        />
      </div>

      {/* Email (solo lectura) */}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          className="field bg-slate-50 text-muted"
          value={usuario.email ?? ""}
          disabled
        />
        <p className="text-xs text-muted mt-1">
          El email de tu cuenta no se puede cambiar desde acá.
        </p>
      </div>

      {state?.error && <p className="alert-danger">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
          Cambios guardados.
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
