BEGIN;

SET search_path TO gasuber, public;

ALTER TABLE gps_unidades
  ADD COLUMN IF NOT EXISTS nivel_carburacion NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS nivel_almacen NUMERIC NULL;

ALTER TABLE gps_unidades
  DROP CONSTRAINT IF EXISTS gps_unidades_nivel_carburacion_check,
  ADD CONSTRAINT gps_unidades_nivel_carburacion_check
  CHECK (nivel_carburacion IS NULL OR (nivel_carburacion >= 0 AND nivel_carburacion <= 100));

ALTER TABLE gps_unidades
  DROP CONSTRAINT IF EXISTS gps_unidades_nivel_almacen_check,
  ADD CONSTRAINT gps_unidades_nivel_almacen_check
  CHECK (nivel_almacen IS NULL OR (nivel_almacen >= 0 AND nivel_almacen <= 100));

COMMIT;

