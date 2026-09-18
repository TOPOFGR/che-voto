import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getEvento, getInscriptos, INSCRIPTOS_MAX } from "@/lib/eventos";
import { PageHeader } from "@/components/ui";
import { ListaParticipantes } from "./lista";

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

export default async function ParticipantesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const evento = await getEvento(usuario, id);
  if (!evento) notFound();
  const inscriptos = await getInscriptos(usuario, evento.id);

  const resumen = resumenGenero(inscriptos.map((i) => i.genero));
  const truncado = inscriptos.length >= INSCRIPTOS_MAX;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={`Participantes (${evento.inscriptos})`}
        subtitle={evento.nombre}
        action={
          <Link href={`/eventos/${evento.id}`} className="btn-ghost">
            Volver
          </Link>
        }
      />

      {resumen && <p className="text-sm text-muted -mt-2 mb-4">{resumen}</p>}

      {inscriptos.length === 0 ? (
        <div className="card p-4">
          <p className="text-sm text-muted">
            Todavía no se inscribió nadie. Compartí el link de inscripción del evento y acá vas
            a ver a cada persona que se anote.
          </p>
          <Link href={`/eventos/${evento.id}`} className="btn-primary mt-3">
            Ir a compartir el link
          </Link>
        </div>
      ) : (
        <>
          {/* Planilla para la puerta: todos los inscriptos con casilla "Presente". */}
          <a
            href={`/api/eventos/${evento.id}/asistencia`}
            download
            className="btn-ghost w-full mb-3"
          >
            Descargar planilla de asistencia (PDF)
          </a>
          <div className="card p-4">
            <ListaParticipantes inscriptos={inscriptos} />
            {truncado && (
              <p className="text-xs text-muted mt-3">
                Mostrando los últimos {INSCRIPTOS_MAX} participantes.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
