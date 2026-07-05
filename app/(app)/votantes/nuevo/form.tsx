"use client";

import { useActionState, useState } from "react";
import { cargarVotante } from "./actions";
import { PinMap } from "./pin-map";
import { ETAPAS, INTENCIONES, type EtapaEmbudo, type IntencionVoto } from "@/lib/types";

// Default map view when there's no point yet: Asunción, Paraguay.
const CENTRO_ASUNCION: [number, number] = [-25.2985, -57.6099];

export function NuevoVotanteForm({
  territorios,
}: {
  territorios: { id: string; nombre: string; tipo: string }[];
}) {
  const [state, formAction, isPending] = useActionState(cargarVotante, null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

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

  return (
    <form action={formAction} className="card p-5 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="nombre" className="label">Nombre *</label>
          <input id="nombre" name="nombre" required className="field" placeholder="Juan" />
        </div>
        <div>
          <label htmlFor="apellido" className="label">Apellido</label>
          <input id="apellido" name="apellido" className="field" placeholder="González" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="numero_cedula" className="label">Cédula</label>
          <input id="numero_cedula" name="numero_cedula" className="field" placeholder="1234567" />
        </div>
        <div>
          <label htmlFor="telefono" className="label">Teléfono</label>
          <input id="telefono" name="telefono" type="tel" className="field" placeholder="+595 ..." />
        </div>
      </div>

      <div>
        <label htmlFor="direccion" className="label">Dirección</label>
        <input id="direccion" name="direccion" className="field" placeholder="Calle y número, barrio" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="genero" className="label">Género</label>
          <select id="genero" name="genero" className="field" defaultValue="">
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="X">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="fecha_nacimiento" className="label">Nacimiento</label>
          <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" className="field" />
        </div>
      </div>

      <div>
        <label htmlFor="territorio_id" className="label">Territorio</label>
        <select id="territorio_id" name="territorio_id" className="field" defaultValue="">
          <option value="">Sin asignar</option>
          {territorios.map((t) => (
            <option key={t.id} value={t.id}>{t.tipo}: {t.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="etapa" className="label">Etapa</label>
          <select id="etapa" name="etapa" className="field" defaultValue="contacto">
            {(Object.keys(ETAPAS) as EtapaEmbudo[]).map((e) => (
              <option key={e} value={e}>{ETAPAS[e].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="intencion" className="label">Intención</label>
          <select id="intencion" name="intencion" className="field" defaultValue="desconocida">
            {(Object.keys(INTENCIONES) as IntencionVoto[]).map((i) => (
              <option key={i} value={i}>{INTENCIONES[i].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ubicación: pin en el mapa (manual o por GPS) para el mapa de calor */}
      <div className="rounded-xl border border-dashed border-[var(--color-line)] p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Ubicación</p>
            <p className="text-xs text-muted">
              {coords
                ? `✓ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "Tocá el mapa para poner el pin, o usá tu GPS"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {coords && (
              <button type="button" onClick={() => setCoords(null)} className="btn-ghost">
                Quitar
              </button>
            )}
            <button type="button" onClick={capturarUbicacion} className="btn-ghost">
              {coords ? "Mi GPS" : "Usar mi ubicación"}
            </button>
          </div>
        </div>
        <div className="h-56 rounded-lg overflow-hidden relative isolate z-0">
          <PinMap value={coords} onChange={setCoords} center={CENTRO_ASUNCION} />
        </div>
        {geoStatus && <p className="text-xs text-amber-600 mt-2">{geoStatus}</p>}
        <input type="hidden" name="lat" value={coords?.lat ?? ""} />
        <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Guardando…" : "Guardar votante"}
      </button>
    </form>
  );
}
