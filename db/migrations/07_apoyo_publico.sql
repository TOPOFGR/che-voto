-- Fase 7: formulario público "Quiero apoyar" (captación sin autenticación).
-- Cada usuario tiene un `slug` legible para su link /apoyar/<slug>; el votante
-- que se suma solo elige cómo apoyar (stickers / voluntario).
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

-- usuarios: identificador público estable para el link "Quiero apoyar".
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_slug_key ON usuarios (slug) WHERE slug IS NOT NULL;

-- vinculos_campania: cómo quiere apoyar quien se sumó por el formulario público.
ALTER TABLE vinculos_campania ADD COLUMN IF NOT EXISTS quiere_stickers boolean NOT NULL DEFAULT false;
ALTER TABLE vinculos_campania ADD COLUMN IF NOT EXISTS quiere_voluntario boolean NOT NULL DEFAULT false;

-- Backfill de slugs para los usuarios existentes: kebab-case sin acentos a
-- partir del nombre, con sufijo numérico ante colisiones. row_number resuelve
-- los duplicados de forma determinística (el primero se queda con el slug base).
WITH base AS (
  SELECT
    id,
    NULLIF(
      trim(both '-' FROM regexp_replace(
        -- pliega acentos comunes a ASCII sin depender de la extensión unaccent
        lower(translate(
          nombre,
          'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
          'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
        )),
        '[^a-z0-9]+', '-', 'g'
      )),
      ''
    ) AS slug_base
  FROM usuarios
  WHERE slug IS NULL
),
numerado AS (
  SELECT
    id,
    COALESCE(slug_base, 'usuario') AS slug_base,
    row_number() OVER (PARTITION BY COALESCE(slug_base, 'usuario') ORDER BY id) AS n
  FROM base
)
UPDATE usuarios u
SET slug = CASE WHEN nu.n = 1 THEN nu.slug_base ELSE nu.slug_base || '-' || nu.n END
FROM numerado nu
WHERE u.id = nu.id;
