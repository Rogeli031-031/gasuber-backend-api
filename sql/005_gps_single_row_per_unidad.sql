BEGIN;

SET search_path TO gasuber, public;

-- Dejar una sola fila por unidad (la más reciente por fecha/id)
DELETE FROM gps_unidades g
USING gps_unidades newer
WHERE g.unidad_id = newer.unidad_id
  AND (
    newer.fecha > g.fecha OR
    (newer.fecha = g.fecha AND newer.id > g.id)
  );

-- Forzar una fila por unidad para permitir UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS ux_gps_unidades_unidad_id
ON gps_unidades (unidad_id);

COMMIT;

