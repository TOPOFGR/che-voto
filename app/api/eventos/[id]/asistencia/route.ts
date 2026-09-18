import { getCurrentUsuario } from "@/lib/session";
import { getEvento, getInscriptosPlanilla } from "@/lib/eventos";
import { formatearFechaEvento } from "@/lib/eventos-config";
import { generarPlanillaAsistencia } from "@/lib/planilla-asistencia";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * Planilla de asistencia en PDF (título del evento + participantes con casilla
 * "Presente"). Bajo `/api`, fuera del matcher de `proxy.ts`, así que valida la
 * sesión acá: mismo alcance que la pantalla del evento (getEvento).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await getCurrentUsuario();
  if (!usuario) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const evento = await getEvento(usuario, id);
  if (!evento) return new Response("No encontrado", { status: 404 });

  const inscriptos = await getInscriptosPlanilla(evento.id);

  const fecha = evento.inicia_local ? formatearFechaEvento(evento.inicia_local) : null;
  const detalles = [
    fecha && fecha.charAt(0).toUpperCase() + fecha.slice(1),
    evento.direccion,
  ].filter((d): d is string => Boolean(d));

  const generado = new Intl.DateTimeFormat("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Asuncion",
  }).format(new Date());

  const pdf = await generarPlanillaAsistencia({
    titulo: evento.nombre,
    detalles,
    inscriptos,
    total: evento.inscriptos,
    generado,
  });

  const archivo = `asistencia-${slugify(evento.nombre).slice(0, 60) || "evento"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
