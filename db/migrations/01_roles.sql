-- Fase 1: nuevos roles (administrador/intendente/concejal/dirigente) + jerarquía usuario→usuario.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.
-- El schema vive en Neon; este archivo es el registro versionado del cambio.

-- 1. Dependen de usuarios.rol y hay que soltarlas antes del ALTER TYPE:
--    - la vista v_accountability_referente
--    - la RLS policy personas_scope (habilitada pero NO forzada; dormida para el owner).
--      Se recrea más abajo alineada al nuevo modelo por jerarquía.
DROP VIEW IF EXISTS v_accountability_referente;
DROP POLICY IF EXISTS personas_scope ON personas;

-- 2. Reemplazar el enum rol_usuario. Sólo usuarios.rol e invitaciones.rol lo usan.
--    Mapeo: admin -> administrador; cualquier otro rol viejo -> dirigente.
ALTER TYPE rol_usuario RENAME TO rol_usuario_old;
CREATE TYPE rol_usuario AS ENUM ('administrador', 'intendente', 'concejal', 'dirigente');

ALTER TABLE usuarios ALTER COLUMN rol DROP DEFAULT;
ALTER TABLE usuarios
  ALTER COLUMN rol TYPE rol_usuario
  USING (CASE rol::text WHEN 'admin' THEN 'administrador' ELSE 'dirigente' END::rol_usuario);
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'dirigente';

ALTER TABLE invitaciones
  ALTER COLUMN rol TYPE rol_usuario
  USING (CASE rol::text WHEN 'admin' THEN 'administrador' ELSE 'dirigente' END::rol_usuario);

DROP TYPE rol_usuario_old;

-- 3. Jerarquía usuario→usuario: superior_id define la visibilidad (subárbol).
--    dirigente.superior = quien lo invitó; concejal.superior = su intendente;
--    intendente/administrador tienen superior NULL. nivel_dirigente ordena sub-niveles.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS superior_id uuid REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel_dirigente integer;
CREATE INDEX IF NOT EXISTS idx_usuarios_superior ON usuarios(superior_id);

-- 4. Función de subárbol de la jerarquía: un usuario + todos sus descendientes
--    (recursivo sobre superior_id). Base de la visibilidad por jerarquía.
CREATE OR REPLACE FUNCTION app_referentes_subordinados(p_usuario uuid)
RETURNS TABLE(usuario_id uuid) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE arbol AS (
    SELECT id FROM usuarios WHERE id = p_usuario
    UNION
    SELECT u.id FROM usuarios u JOIN arbol a ON u.superior_id = a.id
  )
  SELECT id FROM arbol
$$;

-- 5. Recrear la RLS policy alineada a la jerarquía: el administrador ve todo;
--    el resto ve los votantes cuyo referente_id cae en su subárbol.
CREATE POLICY personas_scope ON personas FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = app_usuario_actual() AND u.rol = 'administrador'::rol_usuario
  )
  OR EXISTS (
    SELECT 1 FROM vinculos_campania v
    WHERE v.persona_id = personas.id
      AND v.referente_id IN (SELECT usuario_id FROM app_referentes_subordinados(app_usuario_actual()))
  )
);

-- 6. Recrear la vista con los roles que cargan votantes.
CREATE VIEW v_accountability_referente AS
  SELECT u.id AS referente_id,
    u.nombre,
    COALESCE(m.meta_garantizados, 0) AS meta_garantizados,
    count(v.*) FILTER (WHERE v.etapa = 'simpatizante'::etapa_embudo) AS simpatizantes,
    count(v.*) FILTER (WHERE v.etapa = 'garantizado'::etapa_embudo) AS garantizados,
    count(v.*) FILTER (WHERE v.estado_voto = 'voto'::estado_voto) AS votaron
  FROM usuarios u
    LEFT JOIN vinculos_campania v ON v.referente_id = u.id
    LEFT JOIN metas m ON m.usuario_id = u.id
  WHERE u.rol IN ('intendente'::rol_usuario, 'concejal'::rol_usuario, 'dirigente'::rol_usuario)
  GROUP BY u.id, u.nombre, m.meta_garantizados;
