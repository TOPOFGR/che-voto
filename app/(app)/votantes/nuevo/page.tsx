import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getActiveCampaign, getTerritorios } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TIPOS_TERRITORIO } from "@/lib/types";
import { NuevoVotanteForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NuevoVotantePage() {
  const usuario = await requireUsuario();
  if (usuario.rol === "analista") redirect("/votantes");

  const campaign = await getActiveCampaign();
  const territorios = campaign ? await getTerritorios(campaign.id) : [];

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Cargar votante"
        subtitle="Alta manual en la campaña"
        action={
          <Link href="/votantes" className="btn-ghost">
            Cancelar
          </Link>
        }
      />
      <NuevoVotanteForm
        territorios={territorios.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          tipo: TIPOS_TERRITORIO[t.tipo],
        }))}
      />
    </div>
  );
}
