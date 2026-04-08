-- Telemetría GPS por autotanque (ID-PDV-AUTOTANQUE); pedidos e inicios de ruta enlazados al autotanque.
-- CLI: node scripts/migrate.cjs --file=sql/021_autotanque_gps_y_pedidos.sql

BEGIN;

SET search_path TO gasuber, public;

-- Una fila por autotanque (sustituye el vínculo gps_unidades.unidad_id → unidades.clave para la consola).
CREATE TABLE IF NOT EXISTS gasuber.gps_autotanque (
  autotanque_id BIGINT PRIMARY KEY
    REFERENCES gasuber."ID-PDV-AUTOTANQUE" (id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  nivel NUMERIC NOT NULL,
  nivel_carburacion NUMERIC NULL,
  nivel_almacen NUMERIC NULL,
  velocidad_kmh NUMERIC NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gps_autotanque_nivel CHECK (nivel >= 0 AND nivel <= 100),
  CONSTRAINT gps_autotanque_nc CHECK (
    nivel_carburacion IS NULL OR (nivel_carburacion >= 0 AND nivel_carburacion <= 100)
  ),
  CONSTRAINT gps_autotanque_na CHECK (
    nivel_almacen IS NULL OR (nivel_almacen >= 0 AND nivel_almacen <= 100)
  ),
  CONSTRAINT gps_autotanque_vel CHECK (
    velocidad_kmh IS NULL OR (velocidad_kmh >= 0 AND velocidad_kmh <= 300)
  )
);

CREATE INDEX IF NOT EXISTS idx_gps_autotanque_fecha
  ON gasuber.gps_autotanque (fecha DESC);

ALTER TABLE gasuber.pedidos
  ADD COLUMN IF NOT EXISTS autotanque_id BIGINT NULL
    REFERENCES gasuber."ID-PDV-AUTOTANQUE" (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_autotanque_estado
  ON gasuber.pedidos (autotanque_id, estado, created_at DESC);

-- Inicio de ruta: nuevos registros solo por autotanque (unidad legacy opcional).
ALTER TABLE gasuber.eventos_inicio_ruta
  ADD COLUMN IF NOT EXISTS autotanque_id BIGINT NULL
    REFERENCES gasuber."ID-PDV-AUTOTANQUE" (id) ON DELETE CASCADE;

ALTER TABLE gasuber.eventos_inicio_ruta
  ALTER COLUMN unidad_db_id DROP NOT NULL;

ALTER TABLE gasuber.eventos_inicio_ruta
  ALTER COLUMN unidad_clave DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_inicio_ruta_autotanque_created
  ON gasuber.eventos_inicio_ruta (autotanque_id, created_at DESC);

COMMIT;
