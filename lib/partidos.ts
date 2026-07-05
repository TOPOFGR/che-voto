import "server-only";
import sql from "@/lib/db";
import type { Lista, Partido } from "@/lib/types";

/** Partidos del catálogo de la campaña. */
export async function getPartidos(campaignId: string): Promise<Partido[]> {
  return sql<Partido[]>`
    SELECT id, campaign_id, nombre, sigla, activo
    FROM partidos
    WHERE campaign_id = ${campaignId}
    ORDER BY sigla
  `;
}

/** Listas de la campaña, con datos del partido para display. */
export async function getListas(campaignId: string): Promise<Lista[]> {
  return sql<Lista[]>`
    SELECT l.id, l.campaign_id, l.partido_id, l.nombre, l.numero, l.activo,
           p.sigla AS partido_sigla, p.nombre AS partido_nombre
    FROM listas l
    JOIN partidos p ON p.id = l.partido_id
    WHERE l.campaign_id = ${campaignId}
    ORDER BY p.sigla, l.numero NULLS LAST, l.nombre
  `;
}

/** Listas a las que está postulado un intendente. */
export async function getListasDeIntendente(usuarioId: string): Promise<Lista[]> {
  return sql<Lista[]>`
    SELECT l.id, l.campaign_id, l.partido_id, l.nombre, l.numero, l.activo,
           p.sigla AS partido_sigla, p.nombre AS partido_nombre
    FROM intendente_listas il
    JOIN listas l ON l.id = il.lista_id
    JOIN partidos p ON p.id = l.partido_id
    WHERE il.usuario_id = ${usuarioId}
    ORDER BY p.sigla, l.numero NULLS LAST, l.nombre
  `;
}

export interface IntendenteConListas {
  id: string;
  nombre: string;
  email: string | null;
  listas: { id: string; etiqueta: string }[];
}

/** Intendentes de la campaña con sus listas (para asignar concejales). */
export async function getIntendentes(campaignId: string): Promise<IntendenteConListas[]> {
  return sql<IntendenteConListas[]>`
    SELECT u.id, u.nombre, u.email,
      COALESCE(
        json_agg(
          json_build_object('id', l.id, 'etiqueta', p.sigla || ' · ' || l.nombre)
          ORDER BY p.sigla, l.nombre
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'
      ) AS listas
    FROM usuarios u
    LEFT JOIN intendente_listas il ON il.usuario_id = u.id
    LEFT JOIN listas l ON l.id = il.lista_id
    LEFT JOIN partidos p ON p.id = l.partido_id
    WHERE u.campaign_id = ${campaignId} AND u.rol = 'intendente'
    GROUP BY u.id
    ORDER BY u.nombre
  `;
}

/** ¿La lista está entre las del intendente dado? */
export async function listaEsDeIntendente(
  intendenteId: string,
  listaId: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM intendente_listas
    WHERE usuario_id = ${intendenteId} AND lista_id = ${listaId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function crearPartido(
  campaignId: string,
  data: { nombre: string; sigla: string },
): Promise<void> {
  await sql`
    INSERT INTO partidos (campaign_id, nombre, sigla)
    VALUES (${campaignId}, ${data.nombre}, ${data.sigla})
  `;
}

export async function crearLista(
  campaignId: string,
  data: { partido_id: string; nombre: string; numero?: string | null },
): Promise<void> {
  await sql`
    INSERT INTO listas (campaign_id, partido_id, nombre, numero)
    VALUES (${campaignId}, ${data.partido_id}, ${data.nombre}, ${data.numero ?? null})
  `;
}

/** Reemplaza el conjunto de listas de un intendente por las dadas. */
export async function setListasDeIntendente(
  intendenteId: string,
  listaIds: string[],
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM intendente_listas WHERE usuario_id = ${intendenteId}`;
    for (const listaId of listaIds) {
      await tx`
        INSERT INTO intendente_listas (usuario_id, lista_id)
        VALUES (${intendenteId}, ${listaId})
        ON CONFLICT DO NOTHING
      `;
    }
  });
}
