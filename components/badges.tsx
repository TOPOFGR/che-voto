import {
  ETAPAS,
  INTENCIONES,
  ROLES,
  type EtapaEmbudo,
  type IntencionVoto,
  type RolUsuario,
} from "@/lib/types";

const ROL_COLORS: Record<RolUsuario, string> = {
  admin: "bg-slate-800 text-white",
  jefe_campania: "bg-brand-600 text-white",
  coordinador: "bg-brand-100 text-brand-700",
  referente: "bg-emerald-100 text-emerald-700",
  fiscal: "bg-amber-100 text-amber-700",
  analista: "bg-sky-100 text-sky-700",
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
