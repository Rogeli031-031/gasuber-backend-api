BEGIN;

SET search_path TO gasuber, public;

ALTER TABLE gps_unidades
  ADD COLUMN IF NOT EXISTS velocidad_kmh NUMERIC NULL;

ALTER TABLE gps_unidades
  DROP CONSTRAINT IF EXISTS gps_unidades_velocidad_kmh_check,
  ADD CONSTRAINT gps_unidades_velocidad_kmh_check
  CHECK (velocidad_kmh IS NULL OR (velocidad_kmh >= 0 AND velocidad_kmh <= 300));

COMMIT;
