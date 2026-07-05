import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getActiveCampaign } from "@/lib/queries";
import { getIntendentes, getListas, getPartidos } from "@/lib/partidos";
import { PageHeader, EmptyState } from "@/components/ui";
import { NuevoPartidoForm, NuevaListaForm } from "./catalogo-forms";
import { AsignarListas } from "./asignar-listas";

export const dynamic = "force-dynamic";

export default async function PartidosPage() {
  const usuario = await requireUsuario();
  if (usuario.rol !== "administrador") redirect("/");

  const campaign = await getActiveCampaign();
  const partidos = campaign ? await getPartidos(campaign.id) : [];
  const listas = campaign ? await getListas(campaign.id) : [];
  const intendentes = campaign ? await getIntendentes(campaign.id) : [];

  const listasPorPartido = new Map<string, typeof listas>();
  for (const l of listas) {
    const arr = listasPorPartido.get(l.partido_id) ?? [];
    arr.push(l);
    listasPorPartido.set(l.partido_id, arr);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partidos y listas"
        subtitle="Catálogo de la campaña y asignación de listas a intendentes"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <NuevoPartidoForm />
        <NuevaListaForm partidos={partidos} />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Catálogo
        </h2>
        {partidos.length === 0 ? (
          <EmptyState
            title="Sin partidos"
            description="Creá el primer partido para empezar a armar las listas."
          />
        ) : (
          <div className="space-y-3">
            {partidos.map((p) => {
              const suyas = listasPorPartido.get(p.id) ?? [];
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="chip bg-brand-100 text-brand-700">{p.sigla}</span>
                    <span className="font-semibold text-slate-900">{p.nombre}</span>
                  </div>
                  {suyas.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {suyas.map((l) => (
                        <span key={l.id} className="chip bg-slate-100 text-slate-600">
                          {l.nombre}{l.numero ? ` (${l.numero})` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted mt-2">Sin listas todavía.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Listas por intendente
        </h2>
        {intendentes.length === 0 ? (
          <EmptyState
            title="Sin intendentes"
            description="Cuando invites intendentes, vas a poder asignarles sus listas acá."
          />
        ) : (
          <div className="space-y-3">
            {intendentes.map((i) => (
              <AsignarListas key={i.id} intendente={i} listas={listas} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
