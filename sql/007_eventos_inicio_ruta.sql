BEGIN;

SET search_path TO gasuber, public;

CREATE TABLE IF NOT EXISTS eventos_inicio_ruta (
  id BIGSERIAL PRIMARY KEY,
  unidad_db_id BIGINT NOT NULL REFERENCES unidades (id) ON DELETE CASCADE,
  unidad_clave TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  nivel NUMERIC NOT NULL,
  nivel_carburacion NUMERIC NULL,
  nivel_almacen NUMERIC NULL,
  velocidad_kmh NUMERIC NULL,
  satelites INTEGER NULL,
  gps_fix BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_inicio_ruta_unidad_created
  ON eventos_inicio_ruta (unidad_db_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_inicio_ruta_created
  ON eventos_inicio_ruta (created_at DESC);

COMMIT;
