import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getCreadoresPosibles } from "@/lib/eventos";
import { PageHeader } from "@/components/ui";
import { ROLES_QUE_CREAN_EVENTOS, ROLES_VISION_TOTAL } from "@/lib/types";
import { EventoForm } from "../evento-form";

export const dynamic = "force-dynamic";

export default async function NuevoEventoPage() {
  const usuario = await requireUsuario();
  if (!ROLES_QUE_CREAN_EVENTOS.includes(usuario.rol)) redirect("/eventos");

  // El administrador crea eventos a nombre de un intendente o concejal.
  const esAdmin = ROLES_VISION_TOTAL.includes(usuario.rol);
  const creadores = esAdmin ? await getCreadoresPosibles(usuario) : undefined;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Crear evento"
        subtitle={
          esAdmin
            ? "Elegí de quién es: su foto aparece en el link y los inscriptos quedan como sus votantes."
            : "Tu foto de perfil aparece en el link del evento."
        }
        action={
          <Link href="/eventos" className="btn-ghost">
            Volver
          </Link>
        }
      />
      <EventoForm creadores={creadores} />
    </div>
  );
}
