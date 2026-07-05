import {
  ETAPAS,
  INTENCIONES,
  INTENCIONES_PARTIDO,
  ROLES,
  type EtapaEmbudo,
  type IntencionPartido,
  type IntencionVoto,
  type RolUsuario,
} from "@/lib/types";

const INTENCION_PARTIDO_COLORS: Record<IntencionPartido, string> = {
  ANR: "bg-red-100 text-red-700",
  PLRA: "bg-blue-100 text-blue-700",
  PPQ: "bg-emerald-100 text-emerald-700",
  otro: "bg-slate-100 text-slate-600",
  ninguno: "bg-slate-100 text-slate-500",
  desconozco: "bg-slate-100 text-slate-400",
};

export function IntencionPartidoBadge({ intencion }: { intencion: IntencionPartido | null }) {
  if (!intencion) return null;
  return (
    <span className={`chip ${INTENCION_PARTIDO_COLORS[intencion]}`}>
      {INTENCIONES_PARTIDO[intencion]}
    </span>
  );
}

export function HabilitadoBadge({ habilitado }: { habilitado: boolean | null }) {
  if (habilitado == null) {
    return <span className="chip bg-slate-100 text-slate-400">Sin consultar</span>;
  }
  return habilitado ? (
    <span className="chip bg-emerald-100 text-emerald-700">Habilitado</span>
  ) : (
    <span className="chip bg-red-100 text-red-700">No habilitado</span>
  );
}

const ROL_COLORS: Record<RolUsuario, string> = {
  administrador: "bg-slate-800 text-white",
  intendente: "bg-brand-600 text-white",
  concejal: "bg-brand-100 text-brand-700",
  dirigente: "bg-emerald-100 text-emerald-700",
};

export function RolBadge({ rol }: { rol: RolUsuario }) {
  return (
    <span className={`chip ${ROL_COLORS[rol]}`}>{ROLES[rol].label}</span>
  );
}

export function EtapaBadge({ etapa }: { etapa: EtapaEmbudo | null }) {
  if (!etapa) return <span className="chip bg-slate-100 text-slate-500">Sin etapa</span>;
  const meta = ETAPAS[etapa];
  return (
    <span className="chip" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export function IntencionBadge({ intencion }: { intencion: IntencionVoto | null }) {
  if (!intencion) return null;
  return (
    <span className="chip bg-slate-100 text-slate-600">{INTENCIONES[intencion].label}</span>
  );
}
