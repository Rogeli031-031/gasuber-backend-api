-- Puestos CHOFER / AYUDANTE, empleados por planta, asignación a autotanque (fecha_asignacion).
-- CLI: node scripts/migrate.cjs --file=sql/018_tripulacion_autotanque.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-PUESTO-TRIPULACION" (
  id SMALLSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE
);

INSERT INTO gasuber."ID-PUESTO-TRIPULACION" (codigo)
SELECT v
FROM (VALUES ('CHOFER'), ('AYUDANTE')) AS t(v)
WHERE NOT EXISTS (
  SELECT 1 FROM gasuber."ID-PUESTO-TRIPULACION" p WHERE p.codigo = v
);

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV-AUTOTANQUE-TRIPULACION" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES gasuber."ID-PLANTAS" (id) ON DELETE CASCADE,
  "NOMBRE DE EMPLEADO" TEXT NOT NULL,
  puesto_id SMALLINT NOT NULL REFERENCES gasuber."ID-PUESTO-TRIPULACION" (id),
  "NUMERO DE EMPLEADO" TEXT NOT NULL,
  CONSTRAINT uq_trip_emp_planta_numero UNIQUE (planta_id, "NUMERO DE EMPLEADO")
);

CREATE INDEX IF NOT EXISTS idx_trip_emp_planta_puesto
  ON gasuber."ID-PDV-AUTOTANQUE-TRIPULACION" (planta_id, puesto_id);

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION" (
  id BIGSERIAL PRIMARY KEY,
  autotanque_id BIGINT NOT NULL REFERENCES gasuber."ID-PDV-AUTOTANQUE" (id) ON DELETE CASCADE,
  empleado_id BIGINT NOT NULL REFERENCES gasuber."ID-PDV-AUTOTANQUE-TRIPULACION" (id) ON DELETE RESTRICT,
  puesto_id SMALLINT NOT NULL REFERENCES gasuber."ID-PUESTO-TRIPULACION" (id),
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_trip_asig_autotanque_puesto UNIQUE (autotanque_id, puesto_id),
  CONSTRAINT uq_trip_asig_empleado UNIQUE (empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_asig_autotanque
  ON gasuber."ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION" (autotanque_id);

-- Puebla tiene catálogo de empleados en 019_puebla_id_pdv_autotanque_tripulacion.sql

COMMIT;
