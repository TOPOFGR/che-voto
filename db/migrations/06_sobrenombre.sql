-- Fase 6: sobrenombre (apodo) del votante — campo opcional del alta simplificada.
-- Distinto de `apellido`: es el nombre con el que se lo conoce en el barrio.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS sobrenombre text;
