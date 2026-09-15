import { getEventoPorSlug } from "@/lib/eventos";
import { getFotoPerfil } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Foto de perfil del intendente/concejal que creó el evento, para el encabezado
 * de la página pública /evento/<slug>. Se resuelve por el slug del evento (el
 * route `/api/usuarios/[id]/foto` exige sesión), igual que `/api/apoyar/[slug]/foto`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const evento = await getEventoPorSlug(slug);
  if (!evento?.creador_id) return new Response("No encontrada", { status: 404 });

  const foto = await getFotoPerfil(evento.creador_id);
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.data), {
    status: 200,
    headers: {
      "Content-Type": foto.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
