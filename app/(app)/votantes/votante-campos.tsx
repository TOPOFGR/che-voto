"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PinMap } from "./nuevo/pin-map";
import { FechaInput } from "./fecha-input";
import { consultarPadronAction } from "./padron-action";
import { INTENCIONES_PARTIDO, type IntencionPartido } from "@/lib/types";
import { whatsappUrl } from "@/lib/whatsapp";

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
 * Campos del votante: sección editable + consulta del padrón TSJE + GPS.
 * No incluye el <form> ni el submit: el padre los aporta (alta vs edición usan
 * acciones distintas).
 *
 * Padrón: al completar cédula + fecha de nacimiento se consulta el TSJE vía
 * server action (consultarPadronAction) y se autocompletan habilitación y
 * ubicación de voto. Los campos quedan editables como fallback manual por si
 * el TSJE no responde (o vuelve a poner captcha); en ese caso un link abre la
 * página del TSJE en otra pestaña, con la cédula copiada al portapapeles.
 */
export function VotanteCampos({ initial }: { initial?: VotanteInicial }) {
  const nombreRef = useRef<HTMLInputElement>(null);

  const [habilitado, setHabilitado] = useState<"" | "true" | "false">(
    habInicial(initial?.habilitado),
  );
  const [precisaTransporte, setPrecisaTransporte] = useState(!!initial?.precisa_transporte);
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [cedulaCopiada, setCedulaCopiada] = useState(false);

  // Insumos y resultado de la consulta al padrón.
  const [cedula, setCedula] = useState(initial?.numero_cedula ?? "");
  const [fechaISO, setFechaISO] = useState(initial?.fecha_nacimiento ?? "");
  const [padron, setPadron] = useState({
    distrito: initial?.padron_distrito ?? "",
    departamento: initial?.padron_departamento ?? "",
    zona: initial?.padron_zona ?? "",
    local: initial?.padron_local ?? "",
  });
  const [padronStatus, setPadronStatus] = useState<"idle" | "loading" | "error">("idle");
  // Última combinación cédula|fecha consultada (o ya cargada al editar), para
  // no repetir la misma consulta ni disparar una al montar el form de edición.
  const consultadoRef = useRef(
    initial?.habilitado != null
      ? `${(initial?.numero_cedula ?? "").trim()}|${initial?.fecha_nacimiento ?? ""}`
      : "",
  );
  const requestIdRef = useRef(0);

  const waUrl = whatsappUrl(telefono);

  async function consultarPadron(ced: string, fecha: string) {
    consultadoRef.current = `${ced}|${fecha}`;
    const reqId = ++requestIdRef.current;
    setPadronStatus("loading");
    const res = await consultarPadronAction(ced, fecha);
    if (reqId !== requestIdRef.current) return; // llegó tarde: ya hay otra consulta
    if (!res.ok) {
      setPadronStatus("error");
      return;
    }
    const r = res.result;
    setPadronStatus("idle");
    setHabilitado(r.habilitado ? "true" : "false");
    setPadron({
      distrito: r.distrito ?? "",
      departamento: r.departamento ?? "",
      zona: r.zona ?? "",
      local: r.local ?? "",
    });
    // Autocompleta el nombre desde el padrón si todavía no se cargó.
    if (r.nombre && nombreRef.current && !nombreRef.current.value.trim()) {
      nombreRef.current.value = r.nombre;
    }
  }

  // Consulta automática (con debounce) apenas hay cédula + fecha completas.
  useEffect(() => {
    const ced = cedula.trim();
    if (!ced || !fechaISO || `${ced}|${fechaISO}` === consultadoRef.current) return;
    const t = setTimeout(() => consultarPadron(ced, fechaISO), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula, fechaISO]);

  function abrirPadron() {
    const ced = cedula.trim();
    if (ced) {
      navigator.clipboard
        ?.writeText(ced)
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
          ref={nombreRef}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="numero_cedula" className="label">
            Cédula <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input
            id="numero_cedula" name="numero_cedula" className="field"
            placeholder="1234567" inputMode="numeric"
            value={cedula} onChange={(e) => setCedula(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fecha_nacimiento" className="label">
            Nacimiento <span className="text-muted font-normal">(opcional)</span>
          </label>
          <FechaInput
            id="fecha_nacimiento" name="fecha_nacimiento"
            defaultISO={initial?.fecha_nacimiento}
            onChangeISO={setFechaISO}
          />
        </div>
      </div>

      <div>
        <label htmlFor="telefono" className="label">
          Celular <span className="text-muted font-normal">(opcional)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="telefono" name="telefono" type="tel" className="field flex-1"
            placeholder="+595 9xx xxx xxx" value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          {waUrl ? (
            <a
              href={waUrl} target="_blank" rel="noopener noreferrer"
              className="btn-ghost shrink-0 inline-flex items-center gap-1.5 border border-[#25D366] text-[#128C7E] font-medium"
              title="Enviar mensaje por WhatsApp"
            >
              <Image src="/icons/whatsapp.png" alt="" width={16} height={16} aria-hidden /> WhatsApp
            </a>
          ) : (
            <span
              className="btn-ghost shrink-0 inline-flex items-center gap-1.5 border border-[var(--color-line)] text-muted opacity-60 cursor-not-allowed"
              title="Ingresá un número para habilitar WhatsApp"
            >
              <Image src="/icons/whatsapp.png" alt="" width={16} height={16} aria-hidden className="opacity-60" /> WhatsApp
            </span>
          )}
        </div>
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

      {/* --- Padrón electoral (consulta automática al TSJE) --- */}
      <div className="rounded-xl border border-[var(--color-line)] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Padrón electoral</p>
          <button
            type="button"
            onClick={() => consultarPadron(cedula.trim(), fechaISO)}
            disabled={padronStatus === "loading" || !cedula.trim() || !fechaISO}
            className="btn-ghost border border-[var(--color-line)] shrink-0 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {padronStatus === "loading" && (
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
              />
            )}
            {padronStatus === "loading" ? "Consultando…" : "Consultar TSJE"}
          </button>
        </div>
        {padronStatus === "loading" ? (
          <p className="text-xs text-muted mt-1 flex items-center gap-2" role="status">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
            />
            Consultando el padrón del TSJE…
          </p>
        ) : padronStatus === "error" ? (
          <p className="text-xs text-accent-700 mt-1">
            No se pudo consultar el TSJE.{" "}
            <button type="button" onClick={abrirPadron} className="underline">
              {cedulaCopiada ? "Cédula copiada ✓" : "Consultá manualmente ↗"}
            </button>{" "}
            y cargá el resultado acá.
          </p>
        ) : (
          <p className="text-xs text-muted mt-1">
            Con cédula y fecha de nacimiento, la consulta al TSJE se hace sola.
          </p>
        )}

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
              value={padron.distrito}
              onChange={(e) => setPadron((p) => ({ ...p, distrito: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="padron_departamento" className="label">Departamento</label>
            <input id="padron_departamento" name="padron_departamento" className="field"
              value={padron.departamento}
              onChange={(e) => setPadron((p) => ({ ...p, departamento: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="padron_zona" className="label">Zona</label>
            <input id="padron_zona" name="padron_zona" className="field"
              value={padron.zona}
              onChange={(e) => setPadron((p) => ({ ...p, zona: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="padron_local" className="label">Local</label>
            <input id="padron_local" name="padron_local" className="field"
              value={padron.local}
              onChange={(e) => setPadron((p) => ({ ...p, local: e.target.value }))} />
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
