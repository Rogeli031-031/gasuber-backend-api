-- Catálogo exacto de tripulación (empleados) para la planta Puebla (solo estas filas).
-- Requiere 018_tripulacion_autotanque.sql aplicado.
-- CLI: node scripts/migrate.cjs --file=sql/019_puebla_id_pdv_autotanque_tripulacion.sql

BEGIN;

-- Quitar asignaciones de autotanques de Puebla (empleados cambian de id al resembrar).
DELETE FROM gasuber."ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION" a
USING gasuber."ID-PDV-AUTOTANQUE" atq, gasuber."ID-PLANTAS" p
WHERE a.autotanque_id = atq.id
  AND atq.planta_id = p.id
  AND p."NOMBRE" = 'Puebla';

DELETE FROM gasuber."ID-PDV-AUTOTANQUE-TRIPULACION" e
USING gasuber."ID-PLANTAS" p
WHERE e.planta_id = p.id
  AND p."NOMBRE" = 'Puebla';

INSERT INTO gasuber."ID-PDV-AUTOTANQUE-TRIPULACION" (
  planta_id,
  "NOMBRE DE EMPLEADO",
  puesto_id,
  "NUMERO DE EMPLEADO"
)
SELECT p.id, v.nombre, pt.id, v.numero_emp
FROM gasuber."ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('OMAR AGUILAR GALEANA', 'CHOFER', '362'),
    ('MANUEL SANCHEZ ALVAREZ', 'CHOFER', '705'),
    ('ISAAC MARTINEZ ZACATECO', 'CHOFER', '771'),
    ('JULIO CESAR CABRERA TORRES', 'CHOFER', '782'),
    ('RICARDO IVAN GUTIERREZ GOMEZ', 'CHOFER', '798'),
    ('JOSE GUILLERMO VALERO ZENTENO', 'CHOFER', '800'),
    ('ORLANDO CABRERA MARTINEZ', 'CHOFER', '805'),
    ('JUAN CARLOS GUZMAN DIAZBARRIGA', 'CHOFER', '808'),
    ('RAFAEL ELVIRA LOPEZ', 'CHOFER', '820'),
    ('JOSE GABRIEL CAMPOS BENITEZ', 'CHOFER', '821'),
    ('RAFAEL MORENO MENDEZ', 'CHOFER', '822'),
    ('JOSE RIVERA VARGAS', 'AYUDANTE', '756'),
    ('OMAR LOPEZ MERINO', 'AYUDANTE', '797'),
    ('ENRIQUE TORRES CHAVEZ', 'AYUDANTE', '799'),
    ('VICTORIANO NOLASCO MONARCA', 'AYUDANTE', '803'),
    ('FERNANDO ALVAREZ GONZALEZ', 'AYUDANTE', '804'),
    ('WILLIAMS JARED CORTES MORALES', 'AYUDANTE', '806'),
    ('MARCO ANTONIO PALOMINO BERMUDEZ', 'AYUDANTE', '811'),
    ('ANGEL HERNANDEZ CORONA', 'AYUDANTE', '812'),
    ('JOSE DE JESUS LOPEZ ROJAS', 'AYUDANTE', '814'),
    ('JUAN MANUEL LOEZA RAMIREZ', 'AYUDANTE', '817'),
    ('JOSE ALFREDO GOMEZ QUECHOL', 'AYUDANTE', '818'),
    ('LUIS AYLTON ROSAS NOLASCO', 'AYUDANTE', '823')
) AS v(nombre, codigo_puesto, numero_emp)
JOIN gasuber."ID-PUESTO-TRIPULACION" pt ON pt.codigo = v.codigo_puesto
WHERE p."NOMBRE" = 'Puebla';

COMMIT;
