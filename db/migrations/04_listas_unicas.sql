-- Fase 4: evitar listas duplicadas.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.
--
-- Contexto: un doble submit del alta de listas creó dos "Lista 3" idénticas
-- del PPQ (crearLista no chequeaba duplicados). Se limpia y se agrega unicidad.

-- 1) Borrar duplicadas (mismo campaign/partido/nombre), conservando la más antigua.
DELETE FROM listas l
USING listas keep
WHERE l.campaign_id = keep.campaign_id
  AND l.partido_id = keep.partido_id
  AND l.nombre = keep.nombre
  AND l.created_at > keep.created_at
  AND l.id <> keep.id;

-- 2) Unicidad por partido: una lista no se repite dentro del mismo partido.
--    Debe coincidir con el ON CONFLICT de crearLista() en lib/partidos.ts.
ALTER TABLE listas
  ADD CONSTRAINT listas_campaign_partido_nombre_key
  UNIQUE (campaign_id, partido_id, nombre);
