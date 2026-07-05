import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getVotante } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { EditarVotanteForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function VotanteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireUsuario();
  const { id } = await params;
  const votante = await getVotante(usuario, id);
  if (!votante) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Editar votante"
        subtitle={votante.nombre}
        action={
          <Link href="/votantes" className="btn-ghost">
            Volver
          </Link>
        }
      />
      <EditarVotanteForm votante={votante} />
    </div>
  );
}
