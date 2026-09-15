"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/session";
import {
  crearEvento,
  actualizarEvento,
  getCreadorPosible,
  type DatosEvento,
} from "@/lib/eventos";
import {
  DESCRIPCION_MAX,
  NOMBRE_EVENTO_MAX,
  normalizarLink,
} from "@/lib/eventos-config";
import { ROLES_QUE_CREAN_EVENTOS, ROLES_VISION_TOTAL } from "@/lib/types";

export type EventoState = { error: string } | { ok: true } | null;

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
// Por debajo del límite de 1 MB del body de Server Actions (con margen para el
// overhead multipart). La foto ya llega redimensionada del cliente.
const MAX_BYTES = 950_000;

function str(formData: FormData, name: string): string {
  return ((formData.get(name) as string) || "").trim();
}

function coordenada(valor: string, max: number): number | null {
  if (!valor) return null;
  const n = Number(valor);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

async function leerEvento(
  formData: FormData,
): Promise<{ error: string } | { datos: Omit<DatosEvento, "creador_id"> }> {
  const nombre = str(formData, "nombre");
  if (nombre.length < 3) return { error: "Poné un nombre para el evento." };
  if (nombre.length > NOMBRE_EVENTO_MAX) {
    return { error: `El nombre puede tener hasta ${NOMBRE_EVENTO_MAX} caracteres.` };
  }

  // El navegador envía los saltos de línea del textarea como CRLF, pero el
  // contador y el maxLength del cliente cuentan cada salto como 1 carácter:
  // normalizamos a LF antes de medir (y guardar) para contar igual que el form.
  const descripcion = str(formData, "descripcion").replace(/\r\n?/g, "\n");
  if (descripcion.length > DESCRIPCION_MAX) {
    return {
      error: `La descripción puede tener hasta ${DESCRIPCION_MAX} caracteres (tiene ${descripcion.length}).`,
    };
  }

  const iniciaLocal = str(formData, "inicia_local");
  if (iniciaLocal && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iniciaLocal)) {
    return { error: "Revisá la fecha y hora del evento." };
  }

  const link = normalizarLink(str(formData, "link_saber_mas"));
  if (link === false) {
    return { error: "El link de «Saber más» no es válido. Usá un link que empiece con https://" };
  }

  const lat = coordenada(str(formData, "lat"), 90);
  const lng = coordenada(str(formData, "lng"), 180);

  const eliminarFoto = formData.get("eliminar_foto") === "1";
  let foto: DatosEvento["foto"] = null;
  const archivo = formData.get("foto");
  if (!eliminarFoto && archivo instanceof File && archivo.size > 0) {
    if (!MIME_PERMITIDOS.includes(archivo.type)) {
      return { error: "La foto debe ser JPG, PNG o WebP." };
    }
    if (archivo.size > MAX_BYTES) {
      return { error: "La foto es demasiado grande. Probá con una imagen más chica." };
    }
    foto = { bytes: Buffer.from(await archivo.arrayBuffer()), mime: archivo.type };
  }

  return {
    datos: {
      nombre,
      descripcion: descripcion || null,
      direccion: str(formData, "direccion") || null,
      lat: lat != null && lng != null ? lat : null,
      lng: lat != null && lng != null ? lng : null,
      inicia_local: iniciaLocal || null,
      link_saber_mas: link,
      foto,
      eliminarFoto,
    },
  };
}

/**
 * Crea (sin `id`) o edita (con `id`) un evento. Sólo intendentes, concejales y
 * el administrador; la edición además exige ser el creador (o administrador),
 * lo valida `actualizarEvento`. El administrador elige a nombre de quién es el
 * evento (`creador_id`, revalidado en el server); el resto crea a su nombre. Al
 * crear redirige a la pantalla del evento para compartir el link.
 */
export async function guardarEvento(
  _prev: EventoState,
  formData: FormData,
): Promise<EventoState> {
  const usuario = await requireUsuario();
  if (!ROLES_QUE_CREAN_EVENTOS.includes(usuario.rol)) {
    return { error: "Tu rol no puede crear eventos." };
  }

  const res = await leerEvento(formData);
  if ("error" in res) return res;

  let creadorId = usuario.id;
  if (ROLES_VISION_TOTAL.includes(usuario.rol)) {
    const elegido = str(formData, "creador_id");
    if (!elegido) return { error: "Elegí de quién es el evento." };
    const creador = await getCreadorPosible(usuario, elegido);
    if (!creador) return { error: "Elegí un intendente o concejal válido." };
    creadorId = creador.id;
  }
  const datos: DatosEvento = { ...res.datos, creador_id: creadorId };

  const id = str(formData, "id");
  if (id) {
    const ok = await actualizarEvento(usuario, id, datos);
    if (!ok) return { error: "No encontramos el evento o no podés editarlo." };
    revalidatePath(`/eventos/${id}`);
    revalidatePath("/eventos");
    return { ok: true };
  }

  const nuevoId = await crearEvento(usuario, datos);
  revalidatePath("/eventos");
  redirect(`/eventos/${nuevoId}?creado=1`);
}
