BEGIN;

SET search_path TO gasuber, public;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS unidad_db_id BIGINT NULL REFERENCES unidades(id) ON DELETE SET NULL;

COMMIT;

