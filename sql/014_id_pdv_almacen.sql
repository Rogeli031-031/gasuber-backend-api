-- Almacenes por planta (PDV tipo ALMACEN). Columnas: NOMBRE (lista en consola), TANQUE, CAPACIDAD.
-- CLI: node scripts/migrate.cjs --file=sql/014_id_pdv_almacen.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV-ALMACEN" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES gasuber."ID-PLANTAS" (id) ON DELETE CASCADE,
  "NOMBRE" TEXT NOT NULL,
  "TANQUE" TEXT NOT NULL,
  "CAPACIDAD" TEXT NOT NULL,
  CONSTRAINT uq_id_pdv_almacen_planta_nombre UNIQUE (planta_id, "NOMBRE")
);

CREATE INDEX IF NOT EXISTS idx_id_pdv_almacen_planta
  ON gasuber."ID-PDV-ALMACEN" (planta_id);

-- Puebla tiene catálogo propio en 015_puebla_id_pdv_almacen.sql
INSERT INTO gasuber."ID-PDV-ALMACEN" (planta_id, "NOMBRE", "TANQUE", "CAPACIDAD")
SELECT p.id, 'Almacén principal', 'ALM-1', '10000'
FROM gasuber."ID-PLANTAS" p
WHERE p."NOMBRE" <> 'Puebla'
ON CONFLICT (planta_id, "NOMBRE") DO NOTHING;

COMMIT;
