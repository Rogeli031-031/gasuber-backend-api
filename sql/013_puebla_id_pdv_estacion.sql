-- Catálogo exacto de estaciones para la planta Puebla (solo estas filas).
-- CLI: node scripts/migrate.cjs --file=sql/013_puebla_id_pdv_estacion.sql

BEGIN;

DELETE FROM gasuber."ID-PDV-ESTACION" e
USING gasuber."ID-PLANTAS" p
WHERE e.planta_id = p.id
  AND p."NOMBRE" = 'Puebla';

INSERT INTO gasuber."ID-PDV-ESTACION" (planta_id, "NOMBRE", "TANQUE", "CAPACIDAD")
SELECT p.id, v.nombre, v.tanque, v.capacidad
FROM gasuber."ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('CHACHAPA', 'TANQUE-1', '5000'),
    ('MAGDALENA', 'TANQUE-1', '5000'),
    ('NANACAMILPA', 'TANQUE-1', '5000'),
    ('METEPEC', 'TANQUE-1', '5000')
) AS v(nombre, tanque, capacidad)
WHERE p."NOMBRE" = 'Puebla';

COMMIT;
