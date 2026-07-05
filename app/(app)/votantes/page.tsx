import Link from "next/link";
import { requireUsuario } from "@/lib/session";
import { getVotantes } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui";
import { IntencionPartidoBadge, HabilitadoBadge } from "@/components/badges";
import { AgregarVotanteIcon } from "@/components/icons";
import { ROLES_VISION_TOTAL, type IntencionPartido } from "@/lib/types";
import { Filtros } from "./filtros";

export const dynamic = "force-dynamic";

export default async function VotantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; intencion?: string; habilitado?: string }>;
}) {
  const usuario = await requireUsuario();
  const sp = await searchParams;

  const votantes = await getVotantes(usuario, {
    q: sp.q?.trim() || undefined,
    intencion_partido: (sp.intencion as IntencionPartido) || undefined,
    habilitado: sp.habilitado === "si" ? "si" : sp.habilitado === "no" ? "no" : undefined,
  });

  const alcanceTotal = ROLES_VISION_TOTAL.includes(usuario.rol);

  return (
    <div>
      <PageHeader
        title="Votantes"
        subtitle={
          alcanceTotal
            ? "Todos los votantes de la campaña"
            : "Los votantes que cargaste vos y tu equipo"
        }
        action={
          <Link href="/votantes/nuevo" className="btn-primary">
            <AgregarVotanteIcon className="w-4 h-4" /> Cargar
          </Link>
        }
      />

      <Filtros />

      <p className="text-xs text-muted mb-3">
        {votantes.length} {votantes.length === 1 ? "resultado" : "resultados"}
        {votantes.length === 500 && " (mostrando primeros 500)"}
      </p>

      {votantes.length === 0 ? (
        <EmptyState
          title="No hay votantes que coincidan"
          description="Ajustá los filtros o cargá el primer votante de tu equipo."
          cta={{ href: "/votantes/nuevo", label: "Cargar votante" }}
        />
      ) : (
        <ul className="space-y-2.5">
          {votantes.map((v) => (
            <li key={v.id}>
              <Link href={`/votantes/${v.id}`} className="card p-4 block hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {v.nombre} {v.apellido ?? ""}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-0.5">
                      {v.numero_cedula && <span>CI {v.numero_cedula}</span>}
                      {v.telefono && <span>{v.telefono}</span>}
                      {v.precisa_transporte && <span>🚐 Transporte</span>}
                      {v.estado_voto === "voto" && <span className="text-brand-600">✓ Votó</span>}
                    </div>
                    {v.referente_nombre && (
                      <p className="text-xs text-muted mt-1">
                        Cargó: {v.referente_nombre}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <IntencionPartidoBadge intencion={v.intencion_partido} />
                    <HabilitadoBadge habilitado={v.habilitado} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
