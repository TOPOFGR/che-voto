import "server-only";
import sql from "@/lib/db";
import {
  FUENTE_LANDING_JAZMIN,
  type DatosLandingVotante,
} from "@/lib/landing-jazmin-payload";
import type { DirigentePublico } from "@/lib/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resuelve a Jazmín Galeano como referente de los votantes de su landing.
 * Orden: `LANDING_JAZMIN_USER_ID` → `LANDING_JAZMIN_SLUG` → búsqueda por nombre.
 */
export async function getDirigenteJazminGaleano(): Promise<DirigentePublico | null> {
  const id = process.env.LANDING_JAZMIN_USER_ID?.trim();
  if (id) {
    if (!UUID_RE.test(id)) return null;
    const rows = await sql<DirigentePublico[]>`
      SELECT id, nombre, apoyo_nombre, campaign_id, foto_updated_at
      FROM usuarios
      WHERE id = ${id} AND activo = true
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const slug = process.env.LANDING_JAZMIN_SLUG?.trim();
  if (slug) {
    const rows = await sql<DirigentePublico[]>`
      SELECT id, nombre, apoyo_nombre, campaign_id, foto_updated_at
      FROM usuarios
      WHERE slug = ${slug} AND activo = true
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const rows = await sql<DirigentePublico[]>`
    SELECT id, nombre, apoyo_nombre, campaign_id, foto_updated_at
    FROM usuarios
    WHERE activo = true
      AND (
        nombre ILIKE '%jazmin%galeano%'
        OR nombre ILIKE '%jazmín%galeano%'
        OR coalesce(apoyo_nombre, '') ILIKE '%jazmin%galeano%'
        OR coalesce(apoyo_nombre, '') ILIKE '%jazmín%galeano%'
      )
    ORDER BY created_at
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface ResultadoLandingVotante {
  personaId: string;
  creada: boolean;
}

/**
 * Crea el votante en la campaña de Jazmín si aún no existe. Si ya está
 * (misma cédula, mismo teléfono o mismo nombre), no toca nada: ni datos ni
 * referente. Misma política que la inscripción a eventos.
 */
export async function crearVotanteLandingSiNuevo(
  dirigente: DirigentePublico,
  data: DatosLandingVotante,
): Promise<ResultadoLandingVotante> {
  return sql.begin(async (tx) => {
    let existente: { id: string } | undefined;

    if (data.numero_cedula) {
      // Con cédula, ése es el identificador: no caemos al nombre (hay homónimos).
      [existente] = await tx<{ id: string }[]>`
        SELECT id FROM personas
        WHERE campaign_id = ${dirigente.campaign_id}
          AND regexp_replace(coalesce(numero_cedula, ''), '[^0-9]', '', 'g')
              = ${data.numero_cedula}
        ORDER BY created_at
        LIMIT 1
      `;
    } else {
      if (data.telefono) {
        const tel = data.telefono.replace(/\D/g, "");
        [existente] = await tx<{ id: string }[]>`
          SELECT id FROM personas
          WHERE campaign_id = ${dirigente.campaign_id}
            AND regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') = ${tel}
          ORDER BY created_at
          LIMIT 1
        `;
      }
      if (!existente) {
        [existente] = await tx<{ id: string }[]>`
          SELECT id FROM personas
          WHERE campaign_id = ${dirigente.campaign_id}
            AND lower(btrim(nombre)) = ${data.nombre.toLowerCase()}
          ORDER BY created_at
          LIMIT 1
        `;
      }
    }

    if (existente) return { personaId: existente.id, creada: false };

    const [persona] = await tx<{ id: string }[]>`
      INSERT INTO personas
        (campaign_id, nombre, telefono, numero_cedula, direccion, fuente_dato)
      VALUES
        (${dirigente.campaign_id}, ${data.nombre}, ${data.telefono},
         ${data.numero_cedula}, ${data.direccion}, ${FUENTE_LANDING_JAZMIN})
      RETURNING id
    `;

    await tx`
      INSERT INTO vinculos_campania
        (campaign_id, persona_id, referente_id, intencion_partido, estado_voto)
      VALUES
        (${dirigente.campaign_id}, ${persona.id}, ${dirigente.id},
         'desconozco', 'pendiente')
      ON CONFLICT (persona_id) DO NOTHING
    `;

    return { personaId: persona.id, creada: true };
  });
}
