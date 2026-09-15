import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { ROLES_QUE_CREAN_EVENTOS } from "@/lib/types";
import { EventoForm } from "../evento-form";

export const dynamic = "force-dynamic";

export default async function NuevoEventoPage() {
  const usuario = await requireUsuario();
  if (!ROLES_QUE_CREAN_EVENTOS.includes(usuario.rol)) redirect("/eventos");

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Crear evento"
        subtitle="Tu foto de perfil aparece en el link del evento."
        action={
          <Link href="/eventos" className="btn-ghost">
            Volver
          </Link>
        }
      />
      <EventoForm />
    </div>
  );
}
