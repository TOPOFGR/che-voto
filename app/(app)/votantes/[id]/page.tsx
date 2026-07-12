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

      {votante.fuente_dato === "formulario_publico" && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-medium text-slate-700">
            Se sumó por el formulario público
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {votante.quiere_stickers && (
              <span className="chip bg-brand-100 text-brand-700">Quiere stickers</span>
            )}
            {votante.quiere_voluntario && (
              <span className="chip bg-brand-100 text-brand-700">Voluntario/a</span>
            )}
            {!votante.quiere_stickers && !votante.quiere_voluntario && (
              <span className="chip bg-slate-100 text-slate-500">Sin preferencia</span>
            )}
          </div>
        </div>
      )}

      <EditarVotanteForm votante={votante} />
    </div>
  );
}
