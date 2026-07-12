import { getSessionUser } from "@/lib/session";
import { getFotoPerfil } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Sirve la foto de perfil de un usuario. Requiere sesión (cualquier usuario
 * autenticado puede ver el avatar de un compañero). Está bajo `/api`, excluido
 * del matcher de `proxy.ts`, así que no hay redirect a login. Llamar a
 * `auth.getSession()` en un route handler es seguro (el gotcha de cookies sólo
 * aplica al render de RSC).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const su = await getSessionUser();
  if (!su) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const foto = await getFotoPerfil(id);
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(foto.data), {
    status: 200,
    headers: {
      "Content-Type": foto.mime,
      // Cache-bust por querystring `?v=<foto_updated_at>`; privada porque va
      // detrás de sesión.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
