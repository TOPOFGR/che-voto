"use client";

import { useRef, useState } from "react";
import { PinMap } from "./nuevo/pin-map";
import { FechaInput } from "./fecha-input";
import { INTENCIONES_PARTIDO, type IntencionPartido } from "@/lib/types";

const CENTRO_ASUNCION: [number, number] = [-25.2985, -57.6099];
const PADRON_URL = "https://padron.tsje.gov.py/";

export interface VotanteInicial {
  nombre?: string | null;
  numero_cedula?: string | null;
  fecha_nacimiento?: string | null;
  telefono?: string | null;
  precisa_transporte?: boolean;
  direccion?: string | null;
  intencion_partido?: IntencionPartido | null;
  habilitado?: boolean | null;
  padron_distrito?: string | null;
  padron_departamento?: string | null;
  padron_zona?: string | null;
  padron_local?: string | null;
  lat?: number | null;
  lng?: number | null;
}

// "" (sin consultar) | "true" | "false" — coincide con parseBool del server action.
function habInicial(h?: boolean | null): "" | "true" | "false" {
  if (h === true) return "true";
  if (h === false) return "false";
  return "";
}

/**
 * Campos del votante: sección editable + captura del padrón (manual, interim) + GPS.
 * No incluye el <form> ni el submit: el padre los aporta (alta vs edición usan
 * acciones distintas).
 *
 * Padrón (modo captura manual): el TSJE está detrás de Sucuri WAF + reCAPTCHA v2,
 * que no permite consulta server-to-server ni embeber su página (X-Frame-Options +
 * sin CORS). Hasta tener el dataset oficial, el botón abre el TSJE en otra pestaña
 * y el usuario copia acá el resultado. Los campos se envían como inputs normales.
 */
export function VotanteCampos({ initial }: { initial?: VotanteInicial }) {
  const cedulaRef = useRef<HTMLInputElement>(null);

  const [habilitado, setHabilitado] = useState<"" | "true" | "false">(
    habInicial(initial?.habilitado),
  );
  const [precisaTransporte, setPrecisaTransporte] = useState(!!initial?.precisa_transporte);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [cedulaCopiada, setCedulaCopiada] = useState(false);

  function abrirPadron() {
    const cedula = cedulaRef.current?.value?.trim();
    if (cedula) {
      navigator.clipboard
        ?.writeText(cedula)
        .then(() => {
          setCedulaCopiada(true);
          setTimeout(() => setCedulaCopiada(false), 2500);
        })
        .catch(() => {});
    }
    window.open(PADRON_URL, "_blank", "noopener,noreferrer");
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

  return (
    <div className="flex flex-col gap-4">
      {/* --- Sección editable --- */}
      <div>
        <label htmlFor="nombre" className="label">Nombre *</label>
        <input
          id="nombre" name="nombre" required className="field"
          placeholder="Nombre y apellido" defaultValue={initial?.nombre ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="numero_cedula" className="label">Cédula *</label>
          <input
            id="numero_cedula" name="numero_cedula" required className="field"
            placeholder="1234567" inputMode="numeric"
            ref={cedulaRef} defaultValue={initial?.numero_cedula ?? ""}
          />
        </div>
        <div>
          <label htmlFor="fecha_nacimiento" className="label">Nacimiento *</label>
          <FechaInput
            id="fecha_nacimiento" name="fecha_nacimiento" required
            defaultISO={initial?.fecha_nacimiento}
          />
        </div>
      </div>

      <div>
        <label htmlFor="telefono" className="label">
          Celular <span className="text-muted font-normal">(opcional)</span>
        </label>
        <input
          id="telefono" name="telefono" type="tel" className="field"
          placeholder="+595 9xx xxx xxx" defaultValue={initial?.telefono ?? ""}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox" name="precisa_transporte" checked={precisaTransporte}
          onChange={(e) => setPrecisaTransporte(e.target.checked)}
        />
        Precisa que se lo pase a buscar
      </label>

      <div>
        <label htmlFor="direccion" className="label">
          Dirección donde vive{" "}
          <span className="text-muted font-normal">
            {precisaTransporte ? "(obligatoria)" : "(opcional)"}
          </span>
        </label>
        <input
          id="direccion" name="direccion" className="field"
          required={precisaTransporte}
          placeholder="Calle y número, barrio" defaultValue={initial?.direccion ?? ""}
        />
      </div>

      <div>
        <label htmlFor="intencion_partido" className="label">Intención *</label>
        <select
          id="intencion_partido" name="intencion_partido" required className="field"
          defaultValue={initial?.intencion_partido ?? "desconozco"}
        >
          {(Object.keys(INTENCIONES_PARTIDO) as IntencionPartido[]).map((k) => (
            <option key={k} value={k}>{INTENCIONES_PARTIDO[k]}</option>
          ))}
        </select>
      </div>

      {/* --- Padrón electoral (captura manual, interim) --- */}
      <div className="rounded-xl border border-[var(--color-line)] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Padrón electoral</p>
          <button
            type="button" onClick={abrirPadron}
            className="btn-ghost border border-[var(--color-line)] shrink-0"
          >
            {cedulaCopiada ? "Cédula copiada ✓" : "Abrir padrón TSJE ↗"}
          </button>
        </div>
        <p className="text-xs text-muted mt-1">
          Abrí el TSJE, consultá con la cédula (se copia sola) y copiá el resultado acá.
        </p>

        <div className="mt-3">
          <label htmlFor="habilitado" className="label">Habilitación</label>
          <select
            id="habilitado" name="habilitado" className="field"
            value={habilitado}
            onChange={(e) => setHabilitado(e.target.value as "" | "true" | "false")}
          >
            <option value="">Sin consultar</option>
            <option value="true">Habilitado</option>
            <option value="false">No habilitado</option>
          </select>
        </div>

        {habilitado === "false" && (
          <p className="mt-3 flex items-center gap-2 font-bold text-accent-700">
            <span className="text-lg">✕</span> NO HABILITADO PARA LAS ELECCIONES
          </p>
        )}
        {habilitado === "true" && (
          <p className="mt-3 flex items-center gap-2 font-semibold text-brand-700">
            <span className="text-lg">✓</span> Votante habilitado
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="padron_distrito" className="label">Distrito</label>
            <input id="padron_distrito" name="padron_distrito" className="field"
              defaultValue={initial?.padron_distrito ?? ""} />
          </div>
          <div>
            <label htmlFor="padron_departamento" className="label">Departamento</label>
            <input id="padron_departamento" name="padron_departamento" className="field"
              defaultValue={initial?.padron_departamento ?? ""} />
          </div>
          <div>
            <label htmlFor="padron_zona" className="label">Zona</label>
            <input id="padron_zona" name="padron_zona" className="field"
              defaultValue={initial?.padron_zona ?? ""} />
          </div>
          <div>
            <label htmlFor="padron_local" className="label">Local</label>
            <input id="padron_local" name="padron_local" className="field"
              defaultValue={initial?.padron_local ?? ""} />
          </div>
        </div>
      </div>

      {/* --- Ubicación (opcional) --- */}
      <div className="rounded-xl border border-dashed border-[var(--color-line)] p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Ubicación (opcional)</p>
            <p className="text-xs text-muted">
              {coords
                ? `✓ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "Tocá el mapa o usá tu GPS"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {coords && (
              <button type="button" onClick={() => setCoords(null)} className="btn-ghost">Quitar</button>
            )}
            <button type="button" onClick={capturarUbicacion} className="btn-ghost">
              {coords ? "Mi GPS" : "Usar mi ubicación"}
            </button>
          </div>
        </div>
        <div className="h-56 rounded-lg overflow-hidden relative isolate z-0">
          <PinMap value={coords} onChange={setCoords} center={CENTRO_ASUNCION} />
        </div>
        {geoStatus && <p className="text-xs text-accent-600 mt-2">{geoStatus}</p>}
        <input type="hidden" name="lat" value={coords?.lat ?? ""} />
        <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      </div>
    </div>
  );
}
