-- Catálogo exacto de almacenes para la planta Puebla (solo estas filas).
-- CLI: node scripts/migrate.cjs --file=sql/015_puebla_id_pdv_almacen.sql

BEGIN;

DELETE FROM gasuber."ID-PDV-ALMACEN" a
USING gasuber."ID-PLANTAS" p
WHERE a.planta_id = p.id
  AND p."NOMBRE" = 'Puebla';

INSERT INTO gasuber."ID-PDV-ALMACEN" (planta_id, "NOMBRE", "TANQUE", "CAPACIDAD")
SELECT p.id, v.nombre, v.tanque, v.capacidad
FROM gasuber."ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('ALMACEN-1', 'ALMACEN-1', '250,000'),
    ('ALMACEN-2', 'ALMACEN-2', '250,000')
) AS v(nombre, tanque, capacidad)
WHERE p."NOMBRE" = 'Puebla';

COMMIT;
