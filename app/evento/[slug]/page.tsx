import type { Metadata } from "next";
import { headers } from "next/headers";
import { getEventoPorSlug } from "@/lib/eventos";
import { formatearFechaEvento } from "@/lib/eventos-config";
import { Avatar } from "@/components/avatar";
import { CalendarioIcon, ChevotoMark, PinUbicacionIcon } from "@/components/icons";
import { ROLES } from "@/lib/types";
import { Descripcion } from "./descripcion";
import { InscripcionForm } from "./inscripcion-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEventoPorSlug(slug);
  if (!evento) return { title: "Evento", robots: { index: false, follow: false } };

  // Imagen absoluta para la vista previa al compartir por WhatsApp/redes.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const imagen =
    evento.foto_v && host
      ? `${proto}://${host}/api/evento/${slug}/foto?v=${evento.foto_v}`
      : undefined;
  const descripcion = evento.descripcion?.slice(0, 160) || undefined;

  return {
    title: evento.nombre,
    description: descripcion,
    robots: { index: false, follow: false },
    openGraph: {
      title: evento.nombre,
      description: descripcion,
      images: imagen ? [imagen] : undefined,
    },
  };
}

export default async function EventoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const evento = await getEventoPorSlug(slug);

  if (!evento) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16 text-center">
        <ChevotoMark className="w-14 h-14 mb-4" />
        <h1 className="text-xl font-extrabold text-slate-900">Evento no disponible</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Este link no existe o ya no está activo. Pedile uno nuevo a la persona que te lo
          compartió.
        </p>
      </main>
    );
  }

  // Nombre público del creador (el mismo que usa en su link "Quiero apoyar").
  const nombreCreador = evento.creador_apoyo_nombre?.trim() || evento.creador_nombre || "";
  const mapsUrl =
    evento.lat != null && evento.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${evento.lat},${evento.lng}`
      : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-6 pb-12">
      <div className="w-full max-w-[480px] flex flex-col gap-4">
        {/* Encabezado del intendente/concejal que organiza */}
        {evento.creador_id && nombreCreador && (
          <header className="flex items-center gap-3">
            <Avatar
              id={evento.creador_id}
              nombre={nombreCreador}
              // Foto vía endpoint público por slug del evento (el route por id exige sesión).
              previewSrc={
                evento.creador_foto_v
                  ? `/api/evento/${slug}/creador-foto?v=${evento.creador_foto_v}`
                  : null
              }
              size={60}
              className="border-[3px] border-brand-500"
            />
            <div className="min-w-0">
              <p className="font-extrabold text-ink leading-tight truncate">{nombreCreador}</p>
              {evento.creador_rol && evento.creador_rol !== "administrador" && (
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {ROLES[evento.creador_rol].label}
                </p>
              )}
              <p className="text-sm text-muted">te invita a este evento</p>
            </div>
          </header>
        )}

        <article className="card overflow-hidden">
          {evento.foto_v && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/evento/${slug}/foto?v=${evento.foto_v}`}
              alt={evento.nombre}
              // contain: la foto puede ser un flyer o un logo; no recortar el texto.
              className="w-full max-h-[420px] object-contain bg-slate-100"
            />
          )}
          <div className="p-5 flex flex-col gap-3">
            <h1 className="text-2xl font-extrabold leading-tight text-ink">{evento.nombre}</h1>

            {(evento.inicia_local || evento.direccion || mapsUrl) && (
              <div className="flex flex-col gap-1.5 text-sm text-slate-700">
                {evento.inicia_local && (
                  <p className="flex items-center gap-2 first-letter:uppercase">
                    <CalendarioIcon className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="first-letter:uppercase">
                      {formatearFechaEvento(evento.inicia_local)}
                    </span>
                  </p>
                )}
                {(evento.direccion || mapsUrl) && (
                  <p className="flex items-center gap-2">
                    <PinUbicacionIcon className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="min-w-0">{evento.direccion ?? "Ver ubicación"}</span>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 font-semibold text-brand-600 hover:underline"
                      >
                        Cómo llegar ↗
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}

            {evento.descripcion && <Descripcion texto={evento.descripcion} />}
          </div>
        </article>

        <InscripcionForm
          slug={slug}
          eventoNombre={evento.nombre}
          linkSaberMas={evento.link_saber_mas}
        />

        <div className="flex items-center justify-center gap-2 opacity-75">
          <ChevotoMark className="w-5 h-5" />
          <span className="text-xs text-muted">Con CheVoto</span>
        </div>
      </div>
    </main>
  );
}
