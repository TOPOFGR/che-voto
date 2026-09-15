import { getEventoPorSlug, getFotoEvento } from "@/lib/eventos";

export const dynamic = "force-dynamic";

/**
 * Foto pública de un evento (/evento/<slug>). Sin sesión: es la imagen de un link
 * que su creador comparte a propósito. Bajo `/api`, excluido del matcher de
 * `proxy.ts`. Cache-bust por `?v=<epoch>`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const evento = await getEventoPorSlug(slug);
  if (!evento) return new Response("No encontrada", { status: 404 });

  const foto = await getFotoEvento(evento.id);
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.data), {
    status: 200,
    headers: {
      "Content-Type": foto.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
