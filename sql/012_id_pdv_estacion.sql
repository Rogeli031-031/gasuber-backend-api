-- Estaciones por planta (solo aplica cuando el PDV elegido es ESTACION).
-- pgAdmin: ejecutar en la BD del esquema gasuber.
-- CLI: node scripts/migrate.cjs --file=sql/012_id_pdv_estacion.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV-ESTACION" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES gasuber."ID-PLANTAS" (id) ON DELETE CASCADE,
  "NOMBRE" TEXT NOT NULL,
  "TANQUE" TEXT NOT NULL,
  "CAPACIDAD" TEXT NOT NULL,
  CONSTRAINT uq_id_pdv_estacion_planta_nombre UNIQUE (planta_id, "NOMBRE")
);

CREATE INDEX IF NOT EXISTS idx_id_pdv_estacion_planta
  ON gasuber."ID-PDV-ESTACION" (planta_id);

-- Un registro de ejemplo por planta (Puebla tiene su propio catálogo en 013).
INSERT INTO gasuber."ID-PDV-ESTACION" (planta_id, "NOMBRE", "TANQUE", "CAPACIDAD")
SELECT p.id, 'Estación principal', '1', '10000'
FROM gasuber."ID-PLANTAS" p
WHERE p."NOMBRE" <> 'Puebla'
ON CONFLICT (planta_id, "NOMBRE") DO NOTHING;

COMMIT;
