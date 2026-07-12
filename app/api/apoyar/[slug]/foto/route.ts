import { getDirigentePorSlug, getFotoPerfil } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Foto pública del dirigente detrás de un link "Quiero apoyar" (/apoyar/<slug>).
 * A diferencia de `/api/usuarios/[id]/foto` (que exige sesión), acá el usuario se
 * resuelve por su `slug` público y activo: la foto es la cara visible de un link
 * que su dueño comparte a propósito, así que se sirve sin autenticación. Bajo
 * `/api`, excluido del matcher de `proxy.ts`, sin redirect a login.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const dirigente = await getDirigentePorSlug(slug);
  if (!dirigente) return new Response("No encontrada", { status: 404 });

  const foto = await getFotoPerfil(dirigente.id);
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.data), {
    status: 200,
    headers: {
      "Content-Type": foto.mime,
      // Pública y cacheable: es un avatar destinado a mostrarse abiertamente.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
