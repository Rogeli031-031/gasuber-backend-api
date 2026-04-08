-- Autotanques por planta (PDV tipo AUTOTANQUE). Lista en consola: columna NUMERO.
-- CLI: node scripts/migrate.cjs --file=sql/016_id_pdv_autotanque.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV-AUTOTANQUE" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES gasuber."ID-PLANTAS" (id) ON DELETE CASCADE,
  "NUMERO" TEXT NOT NULL,
  "MARCA" TEXT NOT NULL,
  "MODELO" TEXT NOT NULL,
  "SERIE" TEXT NOT NULL,
  "PLACAS" TEXT NOT NULL,
  "CAPACIDAD" TEXT NOT NULL,
  CONSTRAINT uq_id_pdv_autotanque_planta_numero UNIQUE (planta_id, "NUMERO")
);

CREATE INDEX IF NOT EXISTS idx_id_pdv_autotanque_planta
  ON gasuber."ID-PDV-AUTOTANQUE" (planta_id);

-- Puebla tiene catálogo propio en 017_puebla_id_pdv_autotanque.sql
INSERT INTO gasuber."ID-PDV-AUTOTANQUE" (
  planta_id,
  "NUMERO",
  "MARCA",
  "MODELO",
  "SERIE",
  "PLACAS",
  "CAPACIDAD"
)
SELECT p.id, 'AT-01', 'N/A', 'N/A', 'N/A', 'N/A', '0'
FROM gasuber."ID-PLANTAS" p
WHERE p."NOMBRE" <> 'Puebla'
ON CONFLICT (planta_id, "NUMERO") DO NOTHING;

COMMIT;
