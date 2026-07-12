-- Fase 8: nombre público personalizable del link "Quiero apoyar".
-- El dirigente elige cómo quiere aparecer (p.ej. "Jaz Concejal"); de ahí sale
-- el slug del link (jaz-concejal), el encabezado y el texto de los stickers.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apoyo_nombre text;
