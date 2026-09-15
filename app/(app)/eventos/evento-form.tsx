"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { PinMap, type LatLng } from "../votantes/nuevo/pin-map";
import { importarUbicacionGoogleMaps } from "../votantes/google-maps-action";
import { guardarEvento, type EventoState } from "./actions";
import { redimensionarImagen } from "@/lib/redimensionar-imagen";
import {
  DESCRIPCION_MAX,
  DESCRIPCION_PREVIEW,
  NOMBRE_EVENTO_MAX,
} from "@/lib/eventos-config";
import { ROLES } from "@/lib/types";
import type { CreadorOpcion, Evento } from "@/lib/eventos";

const CENTRO_ASUNCION: [number, number] = [-25.2985, -57.6099];
const FOTO_MAX_LADO = 1280; // px — la foto del evento se ve a lo ancho de la pantalla.

/**
 * Alta (sin `evento`) y edición (con `evento`) de un evento. `creadores` sólo
 * llega para el administrador: muestra el selector de a nombre de quién es.
 */
export function EventoForm({
  evento,
  creadores,
}: {
  evento?: Evento;
  creadores?: CreadorOpcion[];
}) {
  const [state, formAction, isPending] = useActionState<EventoState, FormData>(
    guardarEvento,
    null,
  );
  // Se despacha la action dentro de una transición en vez de usar <form action>:
  // así React no resetea el form ante un error y no se pierden la foto ni los datos.
  const [, startTransition] = useTransition();

  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? "");
  const [coords, setCoords] = useState<LatLng | null>(
    evento?.lat != null && evento?.lng != null ? { lat: evento.lat, lng: evento.lng } : null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [eliminarFoto, setEliminarFoto] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [mapsUrl, setMapsUrl] = useState("");
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Al guardar OK, soltamos el preview local para mostrar la foto persistida
  // (ajuste en render, mismo patrón que el form de perfil).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state && "ok" in state) {
      setPreviewUrl(null);
      setEliminarFoto(false);
    }
  }

  useEffect(() => {
    if (state && "ok" in state && fileRef.current) fileRef.current.value = "";
  }, [state]);

  // Los object URL del preview se revocan al reemplazarlos (handlePick /
  // quitarFoto), no en el cleanup de un effect: en StrictMode ese cleanup corre
  // al montar y revocaba el preview vigente (imagen rota).

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    let archivo = original;
    try {
      archivo = await redimensionarImagen(original, FOTO_MAX_LADO, 0.82);
    } catch {
      // Si falla el redimensionado subimos el original (el server valida igual).
    }
    const dt = new DataTransfer();
    dt.items.add(archivo);
    e.target.files = dt.files;

    setEliminarFoto(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(archivo);
    });
  }

  function quitarFoto() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
    setEliminarFoto(true);
  }

  function capturarUbicacion() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("Este dispositivo no tiene GPS disponible.");
      return;
    }
    setGeoStatus("Obteniendo ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus(null);
      },
      () => setGeoStatus("No se pudo obtener la ubicación. Revisá los permisos."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function importarDesdeMaps() {
    const url = mapsUrl.trim();
    if (!url) return;
    setImportando(true);
    setMapsError(null);
    const res = await importarUbicacionGoogleMaps(url);
    setImportando(false);
    if (!res.ok) {
      setMapsError(res.error);
      return;
    }
    setCoords(res.coords);
    setMapsUrl("");
    setGeoStatus(null);
  }

  const fotoGuardada =
    evento?.foto_v && !eliminarFoto
      ? `/api/evento/${evento.slug}/foto?v=${evento.foto_v}`
      : null;
  const fotoSrc = previewUrl ?? fotoGuardada;

  return (
    <form onSubmit={onSubmit} className="card p-5 flex flex-col gap-4">
      {evento && <input type="hidden" name="id" value={evento.id} />}
      <input type="hidden" name="eliminar_foto" value={eliminarFoto ? "1" : "0"} />

      {/* --- Foto --- */}
      <div>
        <p className="label">Foto del evento</p>
        {/* Un único input de archivo, siempre montado. Si viviera dentro del
            placeholder, al elegir la foto se desmontaría junto con el archivo
            elegido y el evento se guardaría sin foto. */}
        <input
          ref={fileRef}
          id="ev-foto"
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePick}
          className="hidden"
        />
        {fotoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoSrc}
            alt="Foto del evento"
            className="w-full max-h-72 rounded-xl object-contain bg-slate-100"
          />
        ) : (
          <label
            htmlFor="ev-foto"
            className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-line)] bg-slate-50 text-sm text-muted hover:bg-slate-100"
          >
            <span className="text-2xl" aria-hidden>📷</span>
            Tocá para agregar una foto
          </label>
        )}
        {fotoSrc && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor="ev-foto" className="btn-ghost cursor-pointer">
              Cambiar foto
            </label>
            <button type="button" onClick={quitarFoto} className="text-sm text-accent-700 hover:underline">
              Quitar foto
            </button>
          </div>
        )}
        {eliminarFoto && evento?.foto_v && (
          <p className="text-xs text-muted mt-1">Se quitará la foto al guardar.</p>
        )}
      </div>

      {/* --- De quién es (sólo administrador) --- */}
      {creadores && (
        <div>
          <label htmlFor="ev-creador" className="label">¿De quién es el evento? *</label>
          <select
            id="ev-creador"
            name="creador_id"
            required
            className="field"
            defaultValue={evento?.creador_id ?? ""}
          >
            <option value="" disabled>
              Elegí un intendente o concejal
            </option>
            {creadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {ROLES[c.rol].label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">
            Su foto aparece en el link y quienes se inscriban quedan como sus votantes.
          </p>
        </div>
      )}

      {/* --- Nombre --- */}
      <div>
        <label htmlFor="ev-nombre" className="label">Nombre del evento *</label>
        <input
          id="ev-nombre"
          name="nombre"
          required
          minLength={3}
          maxLength={NOMBRE_EVENTO_MAX}
          className="field"
          placeholder="Ej: Caminata por San Vicente"
          defaultValue={evento?.nombre ?? ""}
        />
      </div>

      {/* --- Descripción --- */}
      <div>
        <label htmlFor="ev-descripcion" className="label">Descripción</label>
        <textarea
          id="ev-descripcion"
          name="descripcion"
          rows={5}
          maxLength={DESCRIPCION_MAX}
          className="field"
          placeholder="Contá de qué se trata, qué traer, quiénes van…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
          <span>
            En el link se ven los primeros {DESCRIPCION_PREVIEW} caracteres con «Saber más».
          </span>
          <span className="shrink-0 tabular-nums">
            {descripcion.length}/{DESCRIPCION_MAX}
          </span>
        </div>
      </div>

      {/* --- Fecha --- */}
      <div>
        <label htmlFor="ev-fecha" className="label">
          Fecha y hora <span className="text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="ev-fecha"
          name="inicia_local"
          type="datetime-local"
          className="field"
          defaultValue={evento?.inicia_local ?? ""}
        />
      </div>

      {/* --- Lugar y ubicación --- */}
      <div className="rounded-xl border border-dashed border-[var(--color-line)] p-3 flex flex-col gap-3">
        <div>
          <label htmlFor="ev-direccion" className="label">
            Lugar <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input
            id="ev-direccion"
            name="direccion"
            className="field"
            placeholder="Ej: Plaza Uruguaya, Asunción"
            defaultValue={evento?.direccion ?? ""}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Ubicación en el mapa</p>
            <p className="text-xs text-muted">
              {coords
                ? `✓ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "Podés cargarla ahora o después, al editar"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {coords && (
              <button type="button" onClick={() => setCoords(null)} className="btn-ghost">
                Quitar
              </button>
            )}
            <button type="button" onClick={capturarUbicacion} className="btn-ghost">
              Mi GPS
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="ev-maps" className="label">Pegar link de Google Maps</label>
          <div className="flex items-center gap-2">
            <input
              id="ev-maps"
              type="text"
              inputMode="url"
              className="field flex-1"
              placeholder="https://maps.app.goo.gl/…"
              value={mapsUrl}
              onChange={(e) => {
                setMapsUrl(e.target.value);
                setMapsError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  importarDesdeMaps();
                }
              }}
            />
            <button
              type="button"
              onClick={importarDesdeMaps}
              disabled={importando || !mapsUrl.trim()}
              className="btn-ghost shrink-0"
            >
              {importando ? "Importando…" : "Importar"}
            </button>
          </div>
          {mapsError && <p className="text-xs text-accent-700 mt-1">{mapsError}</p>}
        </div>

        <div className="h-56 rounded-lg overflow-hidden relative isolate z-0">
          <PinMap value={coords} onChange={setCoords} center={CENTRO_ASUNCION} />
        </div>
        {geoStatus && <p className="text-xs text-accent-600">{geoStatus}</p>}
        <input type="hidden" name="lat" value={coords?.lat ?? ""} />
        <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      </div>

      {/* --- Link Saber más --- */}
      <div>
        <label htmlFor="ev-link" className="label">
          Link «Saber más» <span className="text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="ev-link"
          name="link_saber_mas"
          type="text"
          inputMode="url"
          className="field"
          placeholder="https://instagram.com/…"
          defaultValue={evento?.link_saber_mas ?? ""}
        />
        <p className="text-xs text-muted mt-1">
          Aparece como un botón redondo «Saber más» cuando la persona termina de inscribirse.
        </p>
      </div>

      {state && "error" in state && <p className="alert-danger">{state.error}</p>}
      {state && "ok" in state && (
        <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">Cambios guardados.</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Guardando…" : evento ? "Guardar cambios" : "Crear evento"}
      </button>
    </form>
  );
}
