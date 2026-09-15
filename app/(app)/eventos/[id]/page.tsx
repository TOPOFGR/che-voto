import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getEvento } from "@/lib/eventos";
import { formatearFechaEvento } from "@/lib/eventos-config";
import { PageHeader } from "@/components/ui";
import { CalendarioIcon, VotantesIcon } from "@/components/icons";
import { DescripcionEvento } from "@/components/descripcion-evento";
import { CompartirEvento } from "../compartir-evento";

export const dynamic = "force-dynamic";

/**
 * Pantalla del evento: sólo lo justo para reconocerlo, el link para compartir y
 * los dos accesos (participantes y edición). El formulario y la lista viven en
 * sus propias pantallas para no llenar ésta de información.
 */
export default async function EventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  const usuario = await requireUsuario();
  const { id } = await params;
  const sp = await searchParams;

  const evento = await getEvento(usuario, id);
  if (!evento) notFound();

  const fecha = evento.inicia_local ? formatearFechaEvento(evento.inicia_local) : null;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={evento.nombre}
        subtitle={fecha ?? undefined}
        action={
          <Link href="/eventos" className="btn-ghost">
            Volver
          </Link>
        }
      />

      {sp.creado && (
        <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-4">
          ¡Evento creado! Compartí el link para que la gente se inscriba.
        </p>
      )}

      {/* --- Datos del evento --- */}
      <section className="card p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {evento.foto_v ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/evento/${evento.slug}/foto?v=${evento.foto_v}`}
              alt={`Foto de ${evento.nombre}`}
              className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
            />
          ) : (
            <span className="w-16 h-16 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
              <CalendarioIcon className="w-6 h-6" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="first-letter:uppercase text-slate-700">
              {fecha ?? <span className="text-muted">Sin fecha definida</span>}
            </p>
            {evento.direccion && <p className="text-muted">{evento.direccion}</p>}
            {evento.creador_nombre && evento.creador_id !== usuario.id && (
              <p className="text-muted">Es de: {evento.creador_nombre}</p>
            )}
            {evento.link_saber_mas && (
              <a
                href={evento.link_saber_mas}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline break-all"
              >
                {evento.link_saber_mas}
              </a>
            )}
          </div>
        </div>

        {evento.descripcion && <DescripcionEvento texto={evento.descripcion} />}
      </section>

      {/* --- Accesos: la lista y el formulario, cada uno en su pantalla --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        <Link href={`/eventos/${evento.id}/participantes`} className="btn-primary">
          <VotantesIcon className="w-4 h-4" />
          Participantes ({evento.inscriptos})
        </Link>
        <Link href={`/eventos/${evento.id}/editar`} className="btn-ghost">
          Editar evento
        </Link>
      </div>

      <CompartirEvento slug={evento.slug} nombre={evento.nombre} />
    </div>
  );
}
