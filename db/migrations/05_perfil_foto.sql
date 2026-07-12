-- Fase 5: perfil de usuario editable + foto de perfil.
-- Aplicado sobre Neon `metria-campaign-crm` (raspy-breeze-56969217) vía MCP.
--
-- Contexto: se agrega una pantalla /perfil donde el usuario edita su nombre y
-- sube una foto. Los bytes de la imagen NO pueden vivir en `usuarios` porque
-- getCurrentUsuario() hace SELECT u.* en cada request (requireUsuario corre en
-- cada página). Por eso la foto va en una tabla aparte y en `usuarios` sólo
-- queda un timestamp liviano que indica si hay foto y sirve de cache-buster.

-- 1) Flag liviano en usuarios (entra en SELECT u.* sin costo real).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_updated_at timestamptz;

-- 2) Los bytes viven aparte, sólo se leen desde el route handler del avatar.
CREATE TABLE IF NOT EXISTS usuario_fotos (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  data       bytea NOT NULL,
  mime       text  NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
