import Link from "next/link";
import { requireUsuario } from "@/lib/session";
import { getActiveCampaign, getTerritorios, getVotantes } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui";
import { EtapaBadge, IntencionBadge } from "@/components/badges";
import { PlusIcon } from "@/components/icons";
import { ROLES_VISION_TOTAL, type EtapaEmbudo, type IntencionVoto } from "@/lib/types";
import { Filtros } from "./filtros";

export const dynamic = "force-dynamic";

export default async function VotantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; etapa?: string; intencion?: string; territorio?: string }>;
}) {
  const usuario = await requireUsuario();
  const sp = await searchParams;
  const campaign = await getActiveCampaign();

  const territorios = campaign ? await getTerritorios(campaign.id) : [];
  const votantes = await getVotantes(usuario, {
    q: sp.q?.trim() || undefined,
    etapa: (sp.etapa as EtapaEmbudo) || undefined,
    intencion: (sp.intencion as IntencionVoto) || undefined,
    territorioId: sp.territorio || undefined,
  });

  const alcanceTotal = ROLES_VISION_TOTAL.includes(usuario.rol);
  const puedeCargar = usuario.rol !== "analista";

  return (
    <div>
      <PageHeader
        title="Votantes"
        subtitle={
          alcanceTotal
            ? "Todos los votantes de la campaña"
            : "Votantes de tu territorio y los que cargaste"
        }
        action={
          puedeCargar ? (
            <Link href="/votantes/nuevo" className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Cargar
            </Link>
          ) : undefined
        }
      />

      <Filtros territorios={territorios.map((t) => ({ id: t.id, nombre: t.nombre }))} />

      <p className="text-xs text-muted mb-3">
        {votantes.length} {votantes.length === 1 ? "resultado" : "resultados"}
        {votantes.length === 500 && " (mostrando primeros 500)"}
      </p>

      {votantes.length === 0 ? (
        <EmptyState
          title="No hay votantes que coincidan"
          description={
            puedeCargar
              ? "Ajustá los filtros o cargá el primer votante de tu territorio."
              : "Ajustá los filtros para ver resultados."
          }
          cta={puedeCargar ? { href: "/votantes/nuevo", label: "Cargar votante" } : undefined}
        />
      ) : (
        <ul className="space-y-2.5">
          {votantes.map((v) => (
            <li key={v.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {v.nombre} {v.apellido ?? ""}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-0.5">
                    {v.numero_cedula && <span>CI {v.numero_cedula}</span>}
                    {v.telefono && <span>{v.telefono}</span>}
                    {v.territorio_nombre && <span>📍 {v.territorio_nombre}</span>}
                  </div>
                  {v.referente_nombre && (
                    <p className="text-xs text-muted mt-1">
                      Referente: {v.referente_nombre}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <EtapaBadge etapa={v.etapa} />
                  <IntencionBadge intencion={v.intencion} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
