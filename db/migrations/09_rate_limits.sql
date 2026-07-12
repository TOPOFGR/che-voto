-- Fase 9: rate limiting del formulario público "Quiero apoyar" para frenar spam
-- del endpoint que crea votantes. Contador por clave (IP hasheada + ventana),
-- con ventana fija que se auto-resetea vía `reset_at`. Compartido entre
-- instancias (vive en la DB), así funciona también en serverless.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

CREATE TABLE IF NOT EXISTS rate_limits (
  key       text PRIMARY KEY,
  count     integer NOT NULL DEFAULT 0,
  reset_at  timestamptz NOT NULL
);

-- Para el barrido de filas vencidas (cron opcional:
--   DELETE FROM rate_limits WHERE reset_at < now()).
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);
