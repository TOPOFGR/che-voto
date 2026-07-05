import { requireUsuario } from "@/lib/session";
import { getHeatmapPoints } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import {
  ETAPAS,
  INTENCIONES,
  type EtapaEmbudo,
  type IntencionVoto,
} from "@/lib/types";
import { Heatmap, type MapPoint } from "./heatmap";
import { MapaFiltros } from "./filtros";

export const dynamic = "force-dynamic";

// Default view: Asunción, Paraguay.
const CENTRO_ASUNCION: [number, number] = [-25.2985, -57.6099];

const ETAPA_PESO: Record<EtapaEmbudo, number> = {
  garantizado: 1,
  voluntario: 0.9,
  simpatizante: 0.75,
  contacto: 0.45,
  indeciso: 0.5,
  opositor: 0.2,
  no_contactar: 0.15,
};

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; intencion?: string }>;
}) {
  const usuario = await requireUsuario();
  const sp = await searchParams;

  const raw = await getHeatmapPoints(usuario, {
    etapa: (sp.etapa as EtapaEmbudo) || undefined,
    intencion: (sp.intencion as IntencionVoto) || undefined,
  });

  const points: MapPoint[] = raw.map((p) => {
    const peso =
      (p.intencion ? INTENCIONES[p.intencion].peso : undefined) ??
      (p.etapa ? ETAPA_PESO[p.etapa] : undefined) ??
      0.4;
    return { lat: p.lat, lng: p.lng, weight: Math.max(0.15, peso) };
  });

  return (
    <div>
      <PageHeader
        title="Mapa de calor"
        subtitle={`${points.length} ${
          points.length === 1 ? "votante" : "votantes"
        } con ubicación`}
      />

      <div className="card p-3 mb-3">
        <MapaFiltros />
      </div>

      <div className="card overflow-hidden relative isolate z-0" style={{ height: "68vh" }}>
        <Heatmap points={points} center={CENTRO_ASUNCION} zoom={12} />
        {points.length === 0 && (
          <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
            <div className="bg-white/95 rounded-xl px-5 py-4 shadow-lg text-center max-w-xs pointer-events-auto">
              <p className="font-semibold text-slate-800">Sin datos de ubicación</p>
              <p className="text-sm text-muted mt-1">
                Cargá votantes con su ubicación GPS para ver la concentración en el mapa.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card p-3 mt-3 flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-muted">Intensidad:</span>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-32 rounded-full"
            style={{
              background: "linear-gradient(90deg,#38bdf8,#818cf8,#f59e0b,#22c55e)",
            }}
          />
          <span className="text-xs text-muted">baja → alta afinidad</span>
        </div>
        <span className="text-xs text-muted ml-auto hidden sm:inline">
          Ponderado por etapa e intención de voto
        </span>
      </div>
    </div>
  );
}
