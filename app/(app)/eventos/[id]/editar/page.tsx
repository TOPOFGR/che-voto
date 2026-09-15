import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getCreadoresPosibles, getEvento } from "@/lib/eventos";
import { ROLES_VISION_TOTAL } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { EventoForm } from "../../evento-form";

export const dynamic = "force-dynamic";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const evento = await getEvento(usuario, id);
  if (!evento) notFound();

  // El administrador puede reasignar el evento a otro intendente o concejal.
  const creadores = ROLES_VISION_TOTAL.includes(usuario.rol)
    ? await getCreadoresPosibles(usuario)
    : undefined;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Editar evento"
        subtitle={evento.nombre}
        action={
          <Link href={`/eventos/${evento.id}`} className="btn-ghost">
            Volver
          </Link>
        }
      />
      <EventoForm evento={evento} creadores={creadores} />
    </div>
  );
}
