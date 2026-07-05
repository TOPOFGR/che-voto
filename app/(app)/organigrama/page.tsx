import { requireUsuario } from "@/lib/session";
import { getActiveCampaign, getEquipo, type MiembroEquipo } from "@/lib/queries";
import { getInvitacionesPendientes } from "@/lib/invitaciones";
import { PageHeader, EmptyState } from "@/components/ui";
import { RolBadge } from "@/components/badges";
import { ROLES, TIPOS_TERRITORIO, puedeInvitar, rolesInvitables, type RolUsuario } from "@/lib/types";
import { InvitarPanel } from "./invitar";

export const dynamic = "force-dynamic";

// Visual tiers of the organigram, top → bottom.
const TIERS: { titulo: string; roles: RolUsuario[] }[] = [
  { titulo: "Dirección", roles: ["admin", "jefe_campania"] },
  { titulo: "Coordinación y análisis", roles: ["coordinador", "analista"] },
  { titulo: "Territorio", roles: ["referente", "fiscal"] },
];

function MemberCard({ m, esYo }: { m: MiembroEquipo; esYo: boolean }) {
  return (
    <div
      className={`card p-4 w-full max-w-xs ${
        esYo ? "ring-2 ring-brand-400" : ""
      } ${!m.activo ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0">
          {m.nombre.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">
            {m.nombre} {esYo && <span className="text-brand-600">(vos)</span>}
          </p>
          <RolBadge rol={m.rol} />
        </div>
      </div>

      {m.territorios.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.territorios.map((t) => (
            <span key={t.id} className="chip bg-slate-100 text-slate-600">
              {TIPOS_TERRITORIO[t.tipo]}: {t.nombre}
            </span>
          ))}
        </div>
      )}

      {(m.rol === "referente" || m.rol === "coordinador") && (
        <p className="text-xs text-muted mt-3">
          <span className="font-semibold text-slate-700">{m.votantes_cargados}</span> votantes cargados
        </p>
      )}
    </div>
  );
}

export default async function OrganigramaPage() {
  const usuario = await requireUsuario();
  const campaign = await getActiveCampaign();
  const equipo = campaign ? await getEquipo(campaign.id) : [];

  const invita = puedeInvitar(usuario.rol);
  const pendientes =
    invita && campaign ? await getInvitacionesPendientes(campaign.id) : [];

  return (
    <div>
      <PageHeader
        title="Organigrama"
        subtitle={`Equipo de ${campaign?.nombre ?? "la campaña"} · ${equipo.length} ${
          equipo.length === 1 ? "integrante" : "integrantes"
        }`}
      />

      {invita && (
        <InvitarPanel
          rolesDisponibles={rolesInvitables(usuario.rol)}
          pendientes={pendientes}
        />
      )}

      {equipo.length === 0 ? (
        <EmptyState
          title="Sin integrantes todavía"
          description="A medida que se sumen usuarios a la campaña, aparecerán acá organizados por rol."
        />
      ) : (
        <div className="space-y-8">
          {TIERS.map((tier, i) => {
            const miembros = equipo.filter((m) => tier.roles.includes(m.rol));
            if (miembros.length === 0) return null;
            return (
              <section key={tier.titulo}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {tier.titulo}
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>
                {i > 0 && (
                  <div className="flex justify-center -mt-3 mb-1">
                    <span className="w-px h-4 bg-[var(--color-line)]" />
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  {miembros.map((m) => (
                    <MemberCard key={m.id} m={m} esYo={m.id === usuario.id} />
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-muted text-center pt-2">
            Roles del sistema:{" "}
            {(Object.keys(ROLES) as RolUsuario[])
              .map((r) => ROLES[r].label)
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
