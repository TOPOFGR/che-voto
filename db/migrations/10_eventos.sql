-- Fase 10: eventos con link público de inscripción.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.
--
-- Las tablas `eventos` y `asistencias_evento` venían del schema original (vacías,
-- sin dependencias); se extienden en lugar de crear tablas nuevas. Un intendente
-- o concejal crea el evento (foto, descripción, ubicación, link "Saber más") y
-- comparte /evento/<slug>; quien se inscribe entra como votante del creador y
-- queda registrado en asistencias_evento.

-- 1) eventos: creador, slug público, contenido y cache-buster de la foto.
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS creador_id uuid REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS link_saber_mas text;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS foto_updated_at timestamptz;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS eventos_slug_key ON eventos (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_creador ON eventos (creador_id);

-- 2) Bytes de la foto aparte (mismo criterio que usuario_fotos, migración 05).
CREATE TABLE IF NOT EXISTS evento_fotos (
  evento_id  uuid PRIMARY KEY REFERENCES eventos(id) ON DELETE CASCADE,
  data       bytea NOT NULL,
  mime       text  NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) personas: datos que pide el formulario de inscripción. `genero` ya existía
--    (se guarda 'F' / 'M'). La edad se guarda tal cual la declara la persona.
ALTER TABLE personas ADD COLUMN IF NOT EXISTS edad smallint;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS barrio text;
