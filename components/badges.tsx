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

/* Neutralidad política: los partidos NO se codifican por su color
   (nada de rojo colorado ni azul liberal) — todos gris neutro. */
const INTENCION_PARTIDO_COLORS: Record<IntencionPartido, string> = {
  ANR: "bg-slate-100 text-slate-600",
  PLRA: "bg-slate-100 text-slate-600",
  PPQ: "bg-slate-100 text-slate-600",
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
    <span className="chip bg-brand-100 text-brand-700">Habilitado</span>
  ) : (
    <span className="chip bg-accent-100 text-accent-700">No habilitado</span>
  );
}

const ROL_COLORS: Record<RolUsuario, string> = {
  administrador: "bg-slate-800 text-white",
  intendente: "bg-brand-600 text-white",
  concejal: "bg-brand-100 text-brand-700",
  dirigente: "bg-brand-50 text-brand-600",
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

/* El color ES el dato: esmeralda = a favor, gris = indeciso/desconocida,
   naranja = en contra. Nunca rojo. */
const INTENCION_COLORS: Record<IntencionVoto, { chip: string; dot: string }> = {
  a_favor: { chip: "bg-[var(--estado-favorable-bg)] text-[var(--estado-favorable-text)]", dot: "bg-[var(--estado-favorable)]" },
  probable: { chip: "bg-brand-50 text-brand-600", dot: "bg-brand-400" },
  indeciso: { chip: "bg-[var(--estado-indeciso-bg)] text-[var(--estado-indeciso-text)]", dot: "bg-[var(--estado-indeciso)]" },
  improbable: { chip: "bg-accent-50 text-accent-600", dot: "bg-accent-300" },
  en_contra: { chip: "bg-[var(--estado-contrario-bg)] text-[var(--estado-contrario-text)]", dot: "bg-[var(--estado-contrario)]" },
  desconocida: { chip: "bg-slate-100 text-slate-400", dot: "bg-slate-300" },
};

export function IntencionBadge({ intencion }: { intencion: IntencionVoto | null }) {
  if (!intencion) return null;
  const c = INTENCION_COLORS[intencion];
  return (
    <span className={`chip ${c.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {INTENCIONES[intencion].label}
    </span>
  );
}
