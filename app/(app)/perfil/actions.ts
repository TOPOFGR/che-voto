"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import { auth } from "@/lib/auth/server";
import { actualizarMiPerfil } from "@/lib/queries";

export type PerfilState = { error?: string; ok?: boolean } | null;

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 1_500_000; // 1.5 MB — la foto ya viene redimensionada del cliente.

export async function actualizarPerfil(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const usuario = await requireUsuario();

  const nombre = ((formData.get("nombre") as string) || "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };

  const eliminarFoto = formData.get("eliminar_foto") === "1";

  let foto: { bytes: Buffer; mime: string } | null = null;
  const archivo = formData.get("foto");
  if (!eliminarFoto && archivo instanceof File && archivo.size > 0) {
    if (!MIME_PERMITIDOS.includes(archivo.type)) {
      return { error: "La foto debe ser JPG, PNG o WebP." };
    }
    if (archivo.size > MAX_BYTES) {
      return { error: "La foto es demasiado grande. Probá con una imagen más chica." };
    }
    foto = {
      bytes: Buffer.from(await archivo.arrayBuffer()),
      mime: archivo.type,
    };
  }

  await actualizarMiPerfil(usuario, { nombre, foto, eliminarFoto });

  // Best-effort: mantener el nombre sincronizado en Neon Auth. Si falla, no
  // bloqueamos: la app muestra `usuarios.nombre`, que ya quedó actualizado.
  try {
    await auth.updateUser({ name: nombre });
  } catch {
    // Ignorado a propósito.
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true };
}
