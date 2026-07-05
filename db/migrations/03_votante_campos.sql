-- Fase 3: campos del nuevo alta de votante (padrón view-only, transporte, GOTV, intención de partido).
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

-- personas: flag de transporte + datos view-only que trae el padrón del TSJE.
ALTER TABLE personas ADD COLUMN IF NOT EXISTS precisa_transporte boolean NOT NULL DEFAULT false;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS habilitado boolean;              -- null = no consultado
ALTER TABLE personas ADD COLUMN IF NOT EXISTS padron_distrito text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS padron_departamento text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS padron_zona text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS padron_local text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS padron_consultado_at timestamptz;

-- Intención de voto por partido (dropdown del alta). Distinta del enum intencion_voto
-- (a_favor/probable/...), que modela el embudo de relación.
DO $$ BEGIN
  CREATE TYPE intencion_partido AS ENUM ('ANR', 'PLRA', 'PPQ', 'otro', 'ninguno', 'desconozco');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE vinculos_campania
  ADD COLUMN IF NOT EXISTS intencion_partido intencion_partido NOT NULL DEFAULT 'desconozco';

-- GOTV el día de la elección. "Votó" ya lo cubre estado_voto ('voto').
ALTER TABLE vinculos_campania ADD COLUMN IF NOT EXISTS fue_buscado boolean NOT NULL DEFAULT false;
ALTER TABLE vinculos_campania ADD COLUMN IF NOT EXISTS agradecido boolean NOT NULL DEFAULT false;
