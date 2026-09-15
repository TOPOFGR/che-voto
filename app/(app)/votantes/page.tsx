import Link from "next/link";
import Image from "next/image";
import { requireUsuario } from "@/lib/session";
import { getVotantes, getOrCreateSlugForUsuario } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui";
import { IntencionPartidoBadge, HabilitadoBadge } from "@/components/badges";
import { AgregarVotanteIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/whatsapp";
import { ROLES_VISION_TOTAL, type IntencionPartido } from "@/lib/types";
import { Filtros } from "./filtros";
import { MiLinkApoyo } from "./mi-link-apoyo";

export const dynamic = "force-dynamic";

export default async function VotantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; intencion?: string; habilitado?: string }>;
}) {
  const usuario = await requireUsuario();
  const sp = await searchParams;
  const slug = await getOrCreateSlugForUsuario(usuario);

  const votantes = await getVotantes(usuario, {
    q: sp.q?.trim() || undefined,
    intencion_partido: (sp.intencion as IntencionPartido) || undefined,
    habilitado: sp.habilitado === "si" ? "si" : sp.habilitado === "no" ? "no" : undefined,
  });

  const alcanceTotal = ROLES_VISION_TOTAL.includes(usuario.rol);

  return (
    <div>
      <PageHeader
        title="Votantes"
        subtitle={
          alcanceTotal
            ? "Todos los votantes de la campaña"
            : "Los votantes que cargaste vos y tu equipo"
        }
        action={
          <Link href="/votantes/nuevo" className="btn-primary">
            <AgregarVotanteIcon className="w-4 h-4" /> Cargar
          </Link>
        }
      />

      <MiLinkApoyo slug={slug} apoyoNombre={usuario.apoyo_nombre?.trim() || usuario.nombre} />

      <Filtros />

      <p className="text-xs text-muted mb-3">
        {votantes.length} {votantes.length === 1 ? "resultado" : "resultados"}
        {votantes.length === 500 && " (mostrando primeros 500)"}
      </p>

      {votantes.length === 0 ? (
        <EmptyState
          title="No hay votantes que coincidan"
          description="Ajustá los filtros o cargá el primer votante de tu equipo."
          cta={{ href: "/votantes/nuevo", label: "Cargar votante" }}
        />
      ) : (
        <ul className="space-y-2.5">
          {votantes.map((v) => {
            const waUrl = whatsappUrl(v.telefono);
            return (
              <li
                key={v.id}
                className="card p-4 relative flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                {/* Toda la tarjeta navega al detalle vía el pseudo-elemento
                    estirado (after:inset-0); el botón de WhatsApp queda encima
                    (relative z-10) para ser cliqueable sin anular ese enlace. */}
                <Link
                  href={`/votantes/${v.id}`}
                  className="min-w-0 flex-1 after:absolute after:inset-0"
                >
                  <p className="font-semibold text-slate-900">
                    {v.nombre} {v.apellido ?? ""}
                    {v.sobrenombre && (
                      <span className="font-normal text-muted"> «{v.sobrenombre}»</span>
                    )}
                    {v.fuente_dato === "formulario_publico" && (
                      <span className="chip bg-brand-100 text-brand-700 ml-2 align-middle">
                        Se sumó solo/a
                      </span>
                    )}
                    {v.fuente_dato === "evento" && (
                      <span className="chip bg-brand-100 text-brand-700 ml-2 align-middle">
                        Se inscribió a un evento
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-0.5">
                    {v.numero_cedula && <span>CI {v.numero_cedula}</span>}
                    {v.telefono && <span>{v.telefono}</span>}
                    {v.precisa_transporte && <span>🚐 Transporte</span>}
                    {v.estado_voto === "voto" && <span className="text-brand-600">✓ Votó</span>}
                  </div>
                  {v.referente_nombre && (
                    <p className="text-xs text-muted mt-1">
                      Cargó: {v.referente_nombre}
                    </p>
                  )}
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Enviar WhatsApp"
                      aria-label={`Enviar WhatsApp a ${v.nombre} ${v.apellido ?? ""}`.trim()}
                      className="relative z-10 shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    >
                      <Image src="/icons/whatsapp.png" alt="" width={26} height={26} aria-hidden />
                    </a>
                  )}
                  <div className="flex flex-col items-end gap-1.5">
                    <IntencionPartidoBadge intencion={v.intencion_partido} />
                    <HabilitadoBadge habilitado={v.habilitado} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
