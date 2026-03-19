-- Fase IoT MVP: tabla GPS por unidad
BEGIN;

SET search_path TO gasuber, public;

CREATE TABLE IF NOT EXISTS gps_unidades (
  id SERIAL PRIMARY KEY,
  unidad_id TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lon NUMERIC NOT NULL,
  nivel NUMERIC NOT NULL CHECK (nivel >= 0 AND nivel <= 100),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_unidades_unidad_id ON gps_unidades (unidad_id);
CREATE INDEX IF NOT EXISTS idx_gps_unidades_fecha ON gps_unidades (fecha DESC);

COMMIT;

