import Link from "next/link";
import { requireUsuario } from "@/lib/session";
import { getDashboardStats } from "@/lib/queries";
import { StatCard, PageHeader } from "@/components/ui";
import { AgregarVotanteIcon, MapaIcon, VotantesIcon, ArrowRightIcon } from "@/components/icons";
import {
  INTENCIONES_PARTIDO,
  ROLES,
  ROLES_VISION_TOTAL,
  type IntencionPartido,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await requireUsuario();
  const stats = await getDashboardStats(usuario);

  const alcanceTotal = ROLES_VISION_TOTAL.includes(usuario.rol);
  const intencionMap = new Map(stats.por_intencion_partido.map((i) => [i.intencion_partido, i.n]));
  const maxIntencion = Math.max(1, ...stats.por_intencion_partido.map((i) => i.n));

  return (
    <div>
      <PageHeader
        title={`Hola, ${usuario.nombre.split(" ")[0]}`}
        subtitle={`${ROLES[usuario.rol].label} · ${
          alcanceTotal ? "Vista de toda la campaña" : "Tu territorio asignado"
        }`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Votantes" value={stats.total} />
        <StatCard label="Habilitados" value={stats.habilitados} accent="#0ea372" hint="para votar según el padrón" />
        <StatCard
          label="Intención"
          value={stats.intencion}
          accent="#0a7050"
          hint={alcanceTotal ? "total de votantes cargados" : "habilitados por tu partido"}
        />
        <StatCard label="Con ubicación" value={stats.con_ubicacion} hint="visibles en el mapa" />
      </div>

      {/* Primary action */}
      <Link
        href="/votantes/nuevo"
        className="group relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white shadow-lg shadow-brand-600/30 ring-1 ring-inset ring-white/10 transition-all hover:shadow-xl hover:shadow-brand-600/40 hover:-translate-y-0.5"
      >
        {/* Decorative glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm transition-transform group-hover:scale-105">
          <AgregarVotanteIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight">Cargar votante</p>
          <p className="text-sm text-white/80">Alta manual en el territorio</p>
        </div>
        <ArrowRightIcon className="ml-auto h-5 w-5 shrink-0 text-white/70 transition-transform group-hover:translate-x-1 group-hover:text-white" />
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <Link href="/votantes" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
            <VotantesIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Ver votantes</p>
            <p className="text-xs text-muted">Listado según tu rol</p>
          </div>
        </Link>
        <Link href="/mapa" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center">
            <MapaIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Mapa de calor</p>
            <p className="text-xs text-muted">Concentración de votantes</p>
          </div>
        </Link>
      </div>

      {/* Intención por partido — barras en gris neutro: los partidos no se
          codifican por color (regla de neutralidad del design system). */}
      <div className="card p-5 mt-4">
        <h2 className="font-semibold text-slate-800 mb-4">Intención por partido</h2>
        {stats.total === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay votantes cargados. Empezá con{" "}
            <Link href="/votantes/nuevo" className="text-brand-600 font-medium">
              Cargar votante
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2.5">
            {(Object.keys(INTENCIONES_PARTIDO) as IntencionPartido[]).map((ip) => {
              const n = intencionMap.get(ip) ?? 0;
              return (
                <div key={ip} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-28 shrink-0">
                    {INTENCIONES_PARTIDO[ip]}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all"
                      style={{
                        width: `${(n / maxIntencion) * 100}%`,
                        backgroundColor: ip === "ninguno" || ip === "desconozco" ? "#cbd5e1" : "#94a3b8",
                        minWidth: n > 0 ? "1.5rem" : 0,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-8 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
