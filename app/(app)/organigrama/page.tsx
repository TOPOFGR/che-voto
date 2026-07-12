import { requireUsuario } from "@/lib/session";
import { getActiveCampaign, getEquipo, type MiembroEquipo } from "@/lib/queries";
import { getInvitacionesPendientes } from "@/lib/invitaciones";
import { getIntendentes, getListasDeIntendente } from "@/lib/partidos";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui";
import { RolBadge } from "@/components/badges";
import { Avatar } from "@/components/avatar";
import { PadronIcon } from "@/components/icons";
import { ROLES, puedeInvitar, rolesInvitables, type RolUsuario } from "@/lib/types";
import { InvitarPanel } from "./invitar";

export const dynamic = "force-dynamic";

function MemberCard({ m, esYo }: { m: MiembroEquipo; esYo: boolean }) {
  return (
    <div
      className={`card p-4 w-full max-w-xs ${
        esYo ? "ring-2 ring-brand-400" : ""
      } ${!m.activo ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Avatar
          id={m.id}
          nombre={m.nombre}
          fotoUpdatedAt={m.foto_updated_at}
          size={40}
        />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">
            {m.nombre} {esYo && <span className="text-brand-600">(vos)</span>}
          </p>
          <RolBadge rol={m.rol} />
        </div>
      </div>

      {m.rol !== "administrador" && (
        <p className="text-xs text-muted mt-3">
          <span className="font-semibold text-slate-700">{m.votantes_cargados}</span> votantes cargados
        </p>
      )}
    </div>
  );
}

/** Render a member and its subtree, indented, top → bottom. */
function Rama({
  nodo,
  hijosDe,
  yo,
  nivel,
}: {
  nodo: MiembroEquipo;
  hijosDe: Map<string, MiembroEquipo[]>;
  yo: string;
  nivel: number;
}) {
  const hijos = hijosDe.get(nodo.id) ?? [];
  return (
    <div className={nivel > 0 ? "border-l border-[var(--color-line)] pl-4 sm:pl-6" : ""}>
      <div className="mb-3">
        <MemberCard m={nodo} esYo={nodo.id === yo} />
      </div>
      {hijos.length > 0 && (
        <div className="space-y-3">
          {hijos.map((h) => (
            <Rama key={h.id} nodo={h} hijosDe={hijosDe} yo={yo} nivel={nivel + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function OrganigramaPage() {
  const usuario = await requireUsuario();
  const campaign = await getActiveCampaign();
  const equipo = campaign ? await getEquipo(usuario) : [];

  const invita = puedeInvitar(usuario.rol);
  const pendientes =
    invita && campaign ? await getInvitacionesPendientes(campaign.id) : [];

  // Datos para invitar concejales: el admin elige intendente + lista; un
  // intendente sólo elige lista (de las suyas) porque el concejal cuelga de él.
  const puedeInvitarConcejal = invita && rolesInvitables(usuario.rol).includes("concejal");
  const esIntendente = usuario.rol === "intendente";
  const intendentes =
    puedeInvitarConcejal && !esIntendente && campaign
      ? await getIntendentes(campaign.id)
      : [];
  const misListas = esIntendente
    ? (await getListasDeIntendente(usuario.id)).map((l) => ({
        id: l.id,
        etiqueta: `${l.partido_sigla ?? ""} · ${l.nombre}`,
      }))
    : [];

  // Build the hierarchy tree from superior_id.
  const hijosDe = new Map<string, MiembroEquipo[]>();
  for (const m of equipo) {
    if (!m.superior_id) continue;
    const lista = hijosDe.get(m.superior_id) ?? [];
    lista.push(m);
    hijosDe.set(m.superior_id, lista);
  }
  // Roots: users with no superior, or whose superior isn't in the campaign list.
  const ids = new Set(equipo.map((m) => m.id));
  const raices = equipo.filter((m) => !m.superior_id || !ids.has(m.superior_id));

  return (
    <div>
      <PageHeader
        title="Organigrama"
        subtitle={`Equipo de ${campaign?.nombre ?? "la campaña"} · ${equipo.length} ${
          equipo.length === 1 ? "integrante" : "integrantes"
        }`}
        action={
          usuario.rol === "administrador" ? (
            <Link href="/partidos" className="btn-ghost">
              <PadronIcon className="w-4 h-4" /> Partidos y listas
            </Link>
          ) : undefined
        }
      />

      {invita && (
        <InvitarPanel
          rolesDisponibles={rolesInvitables(usuario.rol)}
          pendientes={pendientes}
          intendentes={intendentes}
          esIntendente={esIntendente}
          misListas={misListas}
        />
      )}

      {equipo.length === 0 ? (
        <EmptyState
          title="Sin integrantes todavía"
          description="A medida que se sumen usuarios a la campaña, aparecerán acá según quién invitó a quién."
        />
      ) : (
        <div className="space-y-4">
          {raices.map((r) => (
            <Rama key={r.id} nodo={r} hijosDe={hijosDe} yo={usuario.id} nivel={0} />
          ))}

          <p className="text-xs text-muted pt-2">
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
