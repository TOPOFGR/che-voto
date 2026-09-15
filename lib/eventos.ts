import "server-only";
import { randomBytes } from "node:crypto";
import sql from "@/lib/db";
import { slugify } from "@/lib/slug";
import {
  ROLES_QUE_CREAN_EVENTOS,
  ROLES_VISION_TOTAL,
  type RolUsuario,
  type Usuario,
} from "@/lib/types";
import type { Sexo } from "@/lib/eventos-config";

// Las fechas se cargan y muestran en hora de Paraguay.
const TZ = "America/Asuncion";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Evento {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  // Fecha/hora en hora de Paraguay, "YYYY-MM-DDTHH:MM" (formato de datetime-local).
  inicia_local: string | null;
  link_saber_mas: string | null;
  // Epoch de la última foto (null = sin foto); cache-buster de /api/evento/<slug>/foto.
  foto_v: string | null;
  creador_id: string | null;
  creador_nombre: string | null;
  inscriptos: number;
}

export interface EventoPublico extends Evento {
  campaign_id: string;
  creador_apoyo_nombre: string | null;
  creador_rol: RolUsuario | null;
  creador_foto_v: string | null;
}

/** Columnas de `Evento`; requiere `eventos e LEFT JOIN usuarios u ON u.id = e.creador_id`. */
function columnas() {
  return sql`
    e.id, e.slug, e.nombre, e.descripcion, e.direccion,
    ST_Y(e.ubicacion::geometry) AS lat, ST_X(e.ubicacion::geometry) AS lng,
    to_char(e.inicia_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD"T"HH24:MI') AS inicia_local,
    e.link_saber_mas,
    extract(epoch FROM e.foto_updated_at)::bigint::text AS foto_v,
    e.creador_id, u.nombre AS creador_nombre,
    (SELECT count(*)::int FROM asistencias_evento a WHERE a.evento_id = e.id) AS inscriptos
  `;
}

/** El administrador ve todos los eventos de la campaña; el resto, los que creó. */
function puedeVer(usuario: Usuario) {
  return ROLES_VISION_TOTAL.includes(usuario.rol)
    ? sql`e.campaign_id = ${usuario.campaign_id}`
    : sql`e.campaign_id = ${usuario.campaign_id} AND e.creador_id = ${usuario.id}`;
}

export async function getEventos(usuario: Usuario): Promise<Evento[]> {
  return sql<Evento[]>`
    SELECT ${columnas()}
    FROM eventos e
    LEFT JOIN usuarios u ON u.id = e.creador_id
    WHERE ${puedeVer(usuario)}
    ORDER BY e.inicia_at DESC NULLS LAST, e.created_at DESC
  `;
}

/** Un evento, sólo si el usuario puede verlo/editarlo. */
export async function getEvento(usuario: Usuario, id: string): Promise<Evento | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await sql<Evento[]>`
    SELECT ${columnas()}
    FROM eventos e
    LEFT JOIN usuarios u ON u.id = e.creador_id
    WHERE e.id = ${id} AND ${puedeVer(usuario)}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Resuelve el evento detrás del link público /evento/<slug> (sin sesión). */
export async function getEventoPorSlug(slug: string): Promise<EventoPublico | null> {
  if (!slug) return null;
  const rows = await sql<EventoPublico[]>`
    SELECT ${columnas()}, e.campaign_id,
           u.apoyo_nombre AS creador_apoyo_nombre, u.rol AS creador_rol,
           extract(epoch FROM u.foto_updated_at)::bigint::text AS creador_foto_v
    FROM eventos e
    LEFT JOIN usuarios u ON u.id = e.creador_id
    WHERE e.slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface CreadorOpcion {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

/**
 * Usuarios activos de la campaña a nombre de quienes el administrador puede
 * crear un evento (intendentes y concejales primero, después administradores).
 */
export async function getCreadoresPosibles(usuario: Usuario): Promise<CreadorOpcion[]> {
  return sql<CreadorOpcion[]>`
    SELECT id, nombre, rol
    FROM usuarios
    WHERE campaign_id = ${usuario.campaign_id}
      AND activo = true
      AND rol::text = ANY(${sql.array(ROLES_QUE_CREAN_EVENTOS)})
    ORDER BY CASE rol WHEN 'intendente' THEN 0 WHEN 'concejal' THEN 1 ELSE 2 END, nombre
  `;
}

/** Valida un creador elegido por el administrador (misma campaña, activo, rol habilitado). */
export async function getCreadorPosible(
  usuario: Usuario,
  id: string,
): Promise<CreadorOpcion | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await sql<CreadorOpcion[]>`
    SELECT id, nombre, rol
    FROM usuarios
    WHERE id = ${id}
      AND campaign_id = ${usuario.campaign_id}
      AND activo = true
      AND rol::text = ANY(${sql.array(ROLES_QUE_CREAN_EVENTOS)})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface DatosEvento {
  // Dueño del evento: su foto va en el link y los inscriptos quedan como sus
  // votantes. Es el usuario logueado, o el elegido por el administrador.
  creador_id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  inicia_local: string | null;
  link_saber_mas: string | null;
  // Foto ya redimensionada en el cliente (o null si no se cambia).
  foto: { bytes: Buffer; mime: string } | null;
  // Borrar la foto actual (tiene prioridad sobre `foto`).
  eliminarFoto: boolean;
}

/**
 * Crea el evento y devuelve su id. El slug no se regenera al editar el nombre,
 * así los links ya compartidos siguen andando; el sufijo aleatorio evita
 * colisiones entre eventos con el mismo nombre.
 */
export async function crearEvento(usuario: Usuario, data: DatosEvento): Promise<string> {
  const base = slugify(data.nombre).slice(0, 50).replace(/-+$/, "") || "evento";
  const slug = `${base}-${randomBytes(3).toString("hex")}`;

  return sql.begin(async (tx) => {
    const ubic =
      data.lat != null && data.lng != null
        ? tx`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography`
        : tx`NULL`;
    const inicia = data.inicia_local
      ? tx`(${data.inicia_local}::timestamp AT TIME ZONE ${TZ})`
      : tx`NULL`;

    const [evento] = await tx<{ id: string }[]>`
      INSERT INTO eventos
        (campaign_id, creador_id, slug, nombre, descripcion, direccion, ubicacion,
         inicia_at, link_saber_mas)
      VALUES
        (${usuario.campaign_id}, ${data.creador_id}, ${slug}, ${data.nombre},
         ${data.descripcion}, ${data.direccion}, ${ubic}, ${inicia}, ${data.link_saber_mas})
      RETURNING id
    `;

    if (data.foto) {
      await tx`
        INSERT INTO evento_fotos (evento_id, data, mime)
        VALUES (${evento.id}, ${data.foto.bytes}, ${data.foto.mime})
      `;
      await tx`UPDATE eventos SET foto_updated_at = now() WHERE id = ${evento.id}`;
    }

    return evento.id;
  });
}

/** Actualiza un evento que el usuario puede editar. Devuelve false si no existe/no puede. */
export async function actualizarEvento(
  usuario: Usuario,
  id: string,
  data: DatosEvento,
): Promise<boolean> {
  const actual = await getEvento(usuario, id);
  if (!actual) return false;

  await sql.begin(async (tx) => {
    const ubic =
      data.lat != null && data.lng != null
        ? tx`ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography`
        : tx`NULL`;
    const inicia = data.inicia_local
      ? tx`(${data.inicia_local}::timestamp AT TIME ZONE ${TZ})`
      : tx`NULL`;

    await tx`
      UPDATE eventos
      SET creador_id = ${data.creador_id},
          nombre = ${data.nombre}, descripcion = ${data.descripcion},
          direccion = ${data.direccion}, ubicacion = ${ubic}, inicia_at = ${inicia},
          link_saber_mas = ${data.link_saber_mas}, updated_at = now()
      WHERE id = ${id}
    `;

    if (data.eliminarFoto) {
      await tx`DELETE FROM evento_fotos WHERE evento_id = ${id}`;
      await tx`UPDATE eventos SET foto_updated_at = NULL WHERE id = ${id}`;
    } else if (data.foto) {
      await tx`
        INSERT INTO evento_fotos (evento_id, data, mime, updated_at)
        VALUES (${id}, ${data.foto.bytes}, ${data.foto.mime}, now())
        ON CONFLICT (evento_id)
        DO UPDATE SET data = EXCLUDED.data, mime = EXCLUDED.mime, updated_at = now()
      `;
      await tx`UPDATE eventos SET foto_updated_at = now() WHERE id = ${id}`;
    }
  });
  return true;
}

/** Bytes + mime de la foto de un evento (para el route handler público). */
export async function getFotoEvento(
  eventoId: string,
): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await sql<{ data: Buffer; mime: string }[]>`
    SELECT data, mime FROM evento_fotos WHERE evento_id = ${eventoId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface Inscripto {
  persona_id: string;
  nombre: string;
  numero_cedula: string | null;
  telefono: string | null;
  genero: string | null;
  edad: number | null;
  barrio: string | null;
  ciudad: string | null;
  inscripto_at: string;
}

/** Inscriptos de un evento. Llamar sólo después de validar acceso con getEvento. */
export async function getInscriptos(eventoId: string): Promise<Inscripto[]> {
  return sql<Inscripto[]>`
    SELECT p.id AS persona_id, p.nombre, p.numero_cedula, p.telefono, p.genero,
           p.edad, p.barrio, p.ciudad,
           to_char(a.created_at AT TIME ZONE ${TZ}, 'DD/MM HH24:MI') AS inscripto_at
    FROM asistencias_evento a
    JOIN personas p ON p.id = a.persona_id
    WHERE a.evento_id = ${eventoId}
    ORDER BY a.created_at DESC
    LIMIT 1000
  `;
}

export interface DatosInscripcion {
  nombre: string;
  // Sólo dígitos.
  numero_cedula: string;
  genero: Sexo;
  edad: number;
  ciudad: string;
  barrio: string;
  telefono: string;
}

/**
 * Inscripción pública a un evento (sin sesión). Si la cédula ya está cargada en
 * la campaña se reusa esa persona sin tocar sus datos (el form es abierto: no
 * dejamos que cualquiera sobrescriba a un votante existente); si no, se crea con
 * `fuente_dato='evento'`. El vínculo va al creador del evento salvo que la
 * persona ya tenga referente (vinculos_campania es único por persona).
 */
export async function inscribirEnEvento(
  evento: Pick<EventoPublico, "id" | "campaign_id" | "creador_id">,
  data: DatosInscripcion,
): Promise<{ yaInscripto: boolean }> {
  return sql.begin(async (tx) => {
    const [existente] = await tx<{ id: string }[]>`
      SELECT id FROM personas
      WHERE campaign_id = ${evento.campaign_id}
        AND regexp_replace(coalesce(numero_cedula, ''), '[^0-9]', '', 'g') = ${data.numero_cedula}
      ORDER BY created_at
      LIMIT 1
    `;

    let personaId: string;
    if (existente) {
      personaId = existente.id;
    } else {
      const [persona] = await tx<{ id: string }[]>`
        INSERT INTO personas
          (campaign_id, nombre, numero_cedula, genero, edad, ciudad, barrio,
           direccion, telefono, fuente_dato)
        VALUES
          (${evento.campaign_id}, ${data.nombre}, ${data.numero_cedula}, ${data.genero},
           ${data.edad}, ${data.ciudad}, ${data.barrio},
           ${`${data.barrio}, ${data.ciudad}`}, ${data.telefono}, 'evento')
        RETURNING id
      `;
      personaId = persona.id;
    }

    await tx`
      INSERT INTO vinculos_campania
        (campaign_id, persona_id, referente_id, intencion_partido, estado_voto)
      VALUES
        (${evento.campaign_id}, ${personaId}, ${evento.creador_id}, 'desconozco', 'pendiente')
      ON CONFLICT (persona_id) DO NOTHING
    `;

    const nueva = await tx`
      INSERT INTO asistencias_evento (evento_id, persona_id)
      VALUES (${evento.id}, ${personaId})
      ON CONFLICT DO NOTHING
      RETURNING persona_id
    `;

    return { yaInscripto: nueva.length === 0 };
  });
}
