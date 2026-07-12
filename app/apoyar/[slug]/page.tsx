import type { Metadata } from "next";
import { getDirigentePorSlug } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { ChevotoMark } from "@/components/icons";
import { ApoyoForm } from "./form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dirigente = await getDirigentePorSlug(slug);
  return {
    title: dirigente ? `Quiero apoyar a ${dirigente.nombre}` : "Quiero apoyar",
    robots: { index: false, follow: false },
  };
}

export default async function ApoyarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dirigente = await getDirigentePorSlug(slug);
  // Nombre a mostrar personalizado (encabezado, iniciales, stickers); si no lo
  // personalizó, cae al nombre real.
  const nombreMostrar = dirigente
    ? dirigente.apoyo_nombre?.trim() || dirigente.nombre
    : "";

  if (!dirigente) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-16 text-center">
        <ChevotoMark className="w-14 h-14 mb-4" />
        <h1 className="text-xl font-extrabold text-slate-900">Link no disponible</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Este link para sumarte no existe o ya no está activo. Pedile uno nuevo a
          la persona que te lo compartió.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-8 pb-12">
      <div className="w-full max-w-[480px] flex flex-col gap-4">
        {/* Encabezado del dirigente */}
        <header className="flex flex-col items-center gap-3 text-center pt-2 pb-1">
          <Avatar
            id={dirigente.id}
            nombre={nombreMostrar}
            // Foto vía endpoint público por slug (el route por id exige sesión);
            // previewSrc gana sobre el src interno. Sin foto → iniciales.
            previewSrc={
              dirigente.foto_updated_at
                ? `/api/apoyar/${slug}/foto?v=${encodeURIComponent(dirigente.foto_updated_at)}`
                : null
            }
            fotoUpdatedAt={dirigente.foto_updated_at}
            size={88}
            className="border-[3px] border-brand-500"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              {nombreMostrar}
            </span>
            <h1 className="text-[28px] font-extrabold leading-tight text-ink">
              ¡Quiero apoyar!
            </h1>
            <p className="mt-1 text-[15px] text-muted leading-snug">
              Dejá tus datos y sumate al equipo. Te contactamos por WhatsApp.
            </p>
          </div>
        </header>

        <ApoyoForm slug={slug} dirigenteNombre={nombreMostrar} />

        <div className="flex items-center justify-center gap-2 opacity-75">
          <ChevotoMark className="w-5 h-5" />
          <span className="text-xs text-muted">Con CheVoto</span>
        </div>
      </div>
    </main>
  );
}
