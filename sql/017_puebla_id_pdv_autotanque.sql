-- Catálogo exacto de autotanques para la planta Puebla (solo estas filas).
-- CLI: node scripts/migrate.cjs --file=sql/017_puebla_id_pdv_autotanque.sql

BEGIN;

DELETE FROM gasuber."ID-PDV-AUTOTANQUE" a
USING gasuber."ID-PLANTAS" p
WHERE a.planta_id = p.id
  AND p."NOMBRE" = 'Puebla';

INSERT INTO gasuber."ID-PDV-AUTOTANQUE" (
  planta_id,
  "NUMERO",
  "MARCA",
  "MODELO",
  "SERIE",
  "PLACAS",
  "CAPACIDAD"
)
SELECT p.id, v.numero, v.marca, v.modelo, v.serie, v.placas, v.capacidad
FROM gasuber."ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('T-11', 'FORD', '1999', '3FDXF46S4XMA35253', 'LF89375', '5800'),
    ('T-12', 'FORD', '1999', '3FDXF46S5XMA34581', 'LF98847', '5900'),
    ('T-13', 'FORD', '1999', '3FDXF46S3XMA35289', 'WY7930A', '5800'),
    ('T-14', 'FORD', '1999', '3FDXF46S4XMA35284', 'LF90799', '5800'),
    ('T-15', 'FORD', '1999', '3FDXF46S2XMA35283', 'WY7932A', '5800'),
    ('T-16', 'FORD', '2020', '1FDUF4GN9LED80340', 'SN26580', '5800'),
    ('T-17', 'FORD', '1999', '3FDXF46S4XMA34037', 'WY7939A', '5800'),
    ('T-18', 'KODIAK', '1999', '3GCM7H180XM503096', 'WY7941A', '12900'),
    ('T-24', 'KODIAK', '1999', '3GCM7H18XXM503252', 'WY7934A', '12900'),
    ('T-65', 'KODIAK', '1999', '3GCM7H185XM503286', 'WY7935A', '12900'),
    ('T-70', 'ISUSU', '2024', '3MGFRR340RM000535', 'SP93654', '12500')
) AS v(numero, marca, modelo, serie, placas, capacidad)
WHERE p."NOMBRE" = 'Puebla';

COMMIT;
