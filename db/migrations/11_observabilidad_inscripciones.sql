-- Fase 11: observabilidad del formulario público de inscripción a eventos.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.
--
-- Por qué: hasta ahora una inscripción que fallaba no dejaba ningún rastro. La
-- server action no tenía try/catch (un error de DB rompía la página entera), el
-- honeypot y el rate limit descartan en silencio, y cuando la cédula ya existe
-- en la campaña los datos del formulario se descartan sin aviso. Ante un reclamo
-- ("me inscribí y no aparezco") no había forma de saber qué pasó.
--
-- Esta tabla guarda UN intento por envío del formulario, con su resultado. Es
-- append-only y no la lee la app: sirve para diagnosticar y para recuperar a mano
-- a quien se perdió.

CREATE TABLE IF NOT EXISTS inscripcion_intentos (
  id            bigserial PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Formulario público de origen ('evento'; queda listo para 'apoyo').
  origen        text NOT NULL,
  -- Código corto que también ve la persona cuando el envío falla: permite cruzar
  -- un reclamo por WhatsApp con la fila exacta.
  codigo        text NOT NULL,
  -- 'ok' | 'validacion' | 'rate_limit' | 'honeypot' | 'link_invalido' | 'error'
  resultado     text NOT NULL,
  -- Campo que falló la validación, o el mensaje del error.
  motivo        text,
  slug          text,
  evento_id     uuid,
  persona_id    uuid,
  -- false = la cédula ya existía en la campaña y se reusó esa persona, así que
  -- los datos que cargó (nombre, teléfono, barrio) NO se guardaron.
  persona_nueva boolean,
  -- true = ya tenía asistencia a este evento (vio "¡Ya estabas inscripto/a!").
  ya_inscripto  boolean,
  -- sha256 salteado de la IP, igual que en rate_limits: nunca la IP cruda.
  ip_hash       text,
  user_agent    text,
  duracion_ms   integer,
  -- Datos del formulario, SÓLO cuando no quedaron persistidos en `personas`.
  -- Es la copia de seguridad del votante que se perdió.
  payload       jsonb
);

CREATE INDEX IF NOT EXISTS idx_intentos_created ON inscripcion_intentos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_resultado ON inscripcion_intentos (resultado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_evento ON inscripcion_intentos (evento_id, created_at DESC);

-- Retención: el payload es dato personal de alguien que quiso inscribirse, así
-- que no se guarda para siempre. Cron sugerido (mensual):
--   UPDATE inscripcion_intentos SET payload = NULL
--   WHERE payload IS NOT NULL AND created_at < now() - interval '90 days';
--   DELETE FROM inscripcion_intentos WHERE created_at < now() - interval '1 year';
