import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUsuario } from "@/lib/session";
import { getCreadoresPosibles, getEvento, getInscriptos } from "@/lib/eventos";
import { SEXOS, type Sexo } from "@/lib/eventos-config";
import { whatsappUrl } from "@/lib/whatsapp";
import { ROLES_VISION_TOTAL } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { EventoForm } from "../evento-form";
import { CompartirEvento } from "../compartir-evento";

export const dynamic = "force-dynamic";

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
  const [inscriptos, creadores] = await Promise.all([
    getInscriptos(evento.id),
    // El administrador puede reasignar el evento a otro intendente o concejal.
    ROLES_VISION_TOTAL.includes(usuario.rol) ? getCreadoresPosibles(usuario) : undefined,
  ]);

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Editar evento"
        subtitle={evento.nombre}
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

      <CompartirEvento slug={evento.slug} nombre={evento.nombre} />

      <EventoForm evento={evento} creadores={creadores} />

      <section className="card p-4 mt-4">
        <h2 className="font-semibold text-slate-900 mb-3">
          Inscriptos <span className="text-muted font-normal">({inscriptos.length})</span>
        </h2>
        {inscriptos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se inscribió nadie.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {inscriptos.map((i) => {
              const waUrl = whatsappUrl(i.telefono);
              const sexo = i.genero && i.genero in SEXOS ? SEXOS[i.genero as Sexo] : null;
              return (
                <li key={i.persona_id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{i.nombre}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      {i.numero_cedula && <span>CI {i.numero_cedula}</span>}
                      {sexo && <span>{sexo}</span>}
                      {i.edad != null && <span>{i.edad} años</span>}
                      {(i.barrio || i.ciudad) && (
                        <span>{[i.barrio, i.ciudad].filter(Boolean).join(", ")}</span>
                      )}
                      {i.telefono && <span>{i.telefono}</span>}
                      <span>Se inscribió {i.inscripto_at}</span>
                    </div>
                  </div>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Enviar WhatsApp"
                      aria-label={`Enviar WhatsApp a ${i.nombre}`}
                      className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    >
                      <Image src="/icons/whatsapp.png" alt="" width={24} height={24} aria-hidden />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
