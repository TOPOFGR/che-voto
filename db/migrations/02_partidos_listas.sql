-- Fase 2: partidos, listas y su vínculo con intendentes/concejales.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.

-- Catálogo de partidos (gestionado por el administrador). Scoped a la campaña.
CREATE TABLE IF NOT EXISTS partidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  nombre text NOT NULL,
  sigla text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Listas: pertenecen a un partido.
CREATE TABLE IF NOT EXISTS listas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  partido_id uuid NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  numero text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listas_partido ON listas(partido_id);

-- Intendente ↔ listas: un intendente puede postularse a varias listas.
CREATE TABLE IF NOT EXISTS intendente_listas (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  lista_id uuid NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, lista_id)
);

-- Concejal → una única lista.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS lista_id uuid REFERENCES listas(id);

-- La invitación lleva el superior y la lista objetivo, así el admin puede fijar
-- a qué intendente pertenece un concejal y en qué lista, sin depender de invited_by.
ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS superior_id uuid REFERENCES usuarios(id);
ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS lista_id uuid REFERENCES listas(id);

-- Seed del catálogo para la campaña activa. El sistema opera hoy sólo con PPQ,
-- pero se siembran los principales para que el admin tenga de dónde elegir/editar.
INSERT INTO partidos (campaign_id, nombre, sigla)
SELECT '68f80cc0-3e5b-4960-aea6-391960867601'::uuid, v.nombre, v.sigla
FROM (VALUES
  ('Partido Patria Querida', 'PPQ'),
  ('Asociación Nacional Republicana', 'ANR'),
  ('Partido Liberal Radical Auténtico', 'PLRA')
) AS v(nombre, sigla)
WHERE NOT EXISTS (
  SELECT 1 FROM partidos p
  WHERE p.campaign_id = '68f80cc0-3e5b-4960-aea6-391960867601'::uuid AND p.sigla = v.sigla
);
