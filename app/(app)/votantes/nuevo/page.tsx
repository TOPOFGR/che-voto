import Link from "next/link";
import { requireUsuario } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { NuevoVotanteForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NuevoVotantePage() {
  await requireUsuario();

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
      <NuevoVotanteForm />
    </div>
  );
}
