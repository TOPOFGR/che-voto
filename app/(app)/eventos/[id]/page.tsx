import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getEvento, getInscriptos, INSCRIPTOS_MAX } from "@/lib/eventos";
import { formatearFechaEvento } from "@/lib/eventos-config";
import { PageHeader } from "@/components/ui";
import { CalendarioIcon } from "@/components/icons";
import { DescripcionEvento } from "@/components/descripcion-evento";
import { CompartirEvento } from "../compartir-evento";
import { InscriptosLista } from "./inscriptos-lista";

export const dynamic = "force-dynamic";

/** "12 mujeres · 8 varones" — resumen rápido de quiénes se anotaron. */
function resumenGenero(generos: (string | null)[]): string | null {
  const mujeres = generos.filter((g) => g === "F").length;
  const varones = generos.filter((g) => g === "M").length;
  const partes: string[] = [];
  if (mujeres) partes.push(`${mujeres} ${mujeres === 1 ? "mujer" : "mujeres"}`);
  if (varones) partes.push(`${varones} ${varones === 1 ? "varón" : "varones"}`);
  return partes.length ? partes.join(" · ") : null;
}

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
  const inscriptos = await getInscriptos(usuario, evento.id);

  const fecha = evento.inicia_local ? formatearFechaEvento(evento.inicia_local) : null;
  const resumen = resumenGenero(inscriptos.map((i) => i.genero));
  const truncado = inscriptos.length >= INSCRIPTOS_MAX;
  const total = `${evento.inscriptos} ${evento.inscriptos === 1 ? "inscripto" : "inscriptos"}`;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={evento.nombre}
        subtitle={total}
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

      {/* --- Datos del evento (compacto: lo importante acá son los inscriptos) --- */}
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

        <Link href={`/eventos/${evento.id}/editar`} className="btn-ghost self-start">
          Editar evento
        </Link>
      </section>

      <CompartirEvento slug={evento.slug} nombre={evento.nombre} />

      {/* --- Inscriptos --- */}
      <section className="card p-4">
        <div className="mb-3">
          <h2 className="font-semibold text-slate-900">
            Inscriptos <span className="text-muted font-normal">({evento.inscriptos})</span>
          </h2>
          {resumen && <p className="text-xs text-muted mt-0.5">{resumen}</p>}
        </div>

        {inscriptos.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no se inscribió nadie. Compartí el link de inscripción y acá vas a ver a
            cada persona que se anote.
          </p>
        ) : (
          <>
            <InscriptosLista inscriptos={inscriptos} />
            {truncado && (
              <p className="text-xs text-muted mt-3">
                Mostrando los últimos {INSCRIPTOS_MAX} inscriptos.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
