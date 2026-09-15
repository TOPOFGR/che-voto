-- Consultas de diagnóstico del formulario público de inscripción a eventos.
-- Se apoyan en `inscripcion_intentos` (migración 11). Correr con el MCP de Neon
-- o desde el SQL editor del proyecto `metria-campaign-crm`.

-- 1) ¿Qué está pasando hoy? Un renglón por resultado.
--    'ok' con persona_nueva=false = se inscribió pero sus datos NO se guardaron
--    (la cédula ya estaba cargada en la campaña).
SELECT resultado,
       count(*) AS intentos,
       count(*) FILTER (WHERE persona_nueva IS FALSE) AS datos_descartados,
       count(*) FILTER (WHERE ya_inscripto) AS ya_estaban,
       round(avg(duracion_ms)) AS ms_promedio
FROM inscripcion_intentos
WHERE created_at > now() - interval '24 hours'
GROUP BY resultado
ORDER BY intentos DESC;

-- 2) Los que NO quedaron inscriptos, con lo que habían escrito: esta es la lista
--    para levantar el teléfono y cargarlos a mano.
SELECT created_at AT TIME ZONE 'America/Asuncion' AS cuando_py,
       codigo, resultado, motivo,
       payload->>'nombre'   AS nombre,
       payload->>'telefono' AS telefono,
       payload->>'cedula'   AS cedula,
       payload->>'ciudad'   AS ciudad,
       payload->>'barrio'   AS barrio
FROM inscripcion_intentos
WHERE resultado <> 'ok'
  AND payload IS NOT NULL
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- 3) Un reclamo puntual: la persona dicta el código que vio en pantalla.
-- SELECT * FROM inscripcion_intentos WHERE codigo = 'XXXXXX';

-- 4) ¿El honeypot se está comiendo gente real? Si aparecen user agents de
--    navegadores comunes (y no bots), es el autocompletado llenando el campo
--    oculto: quien lo dispara ve "¡Listo!" pero no se guarda nada.
SELECT user_agent, count(*) AS veces, max(created_at) AS ultima
FROM inscripcion_intentos
WHERE resultado = 'honeypot'
GROUP BY user_agent
ORDER BY veces DESC;

-- 5) ¿El rate limit está cortando gente real? En un acto muchos comparten la IP
--    del NAT de la operadora; varias IPs distintas cortadas el mismo día es
--    ruido, una sola IP cortando a muchos es el límite quedándose corto.
SELECT date_trunc('hour', created_at) AT TIME ZONE 'America/Asuncion' AS hora_py,
       count(DISTINCT ip_hash) AS conexiones, count(*) AS cortes
FROM inscripcion_intentos
WHERE resultado = 'rate_limit' AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;

-- 6) Cédulas que colisionan: dos inscripciones distintas que cayeron sobre la
--    misma persona ya cargada. Es el caso en que alguien ve "¡Ya estabas
--    inscripto/a!" sin haberse inscripto nunca.
SELECT persona_id, count(*) AS inscripciones,
       array_agg(DISTINCT payload->>'nombre') FILTER (WHERE payload IS NOT NULL)
         AS nombres_cargados
FROM inscripcion_intentos
WHERE resultado = 'ok' AND persona_nueva IS FALSE
GROUP BY persona_id
HAVING count(*) > 1;

-- 7) Errores inesperados por hora (lo que antes rompía la página sin dejar rastro).
SELECT date_trunc('hour', created_at) AT TIME ZONE 'America/Asuncion' AS hora_py,
       count(*) AS errores, min(motivo) AS ejemplo
FROM inscripcion_intentos
WHERE resultado = 'error' AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;
