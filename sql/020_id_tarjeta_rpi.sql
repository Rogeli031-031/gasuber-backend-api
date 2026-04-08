-- Catálogo ID-TARJETA (RPI-001 … RPI-040) y columna tarjeta_id en autotanque / estación / almacén (opción B).
-- CLI: node scripts/migrate.cjs --file=sql/020_id_tarjeta_rpi.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-TARJETA" (
  id BIGSERIAL PRIMARY KEY,
  "NOMBRE" TEXT NOT NULL UNIQUE
);

INSERT INTO gasuber."ID-TARJETA" ("NOMBRE")
SELECT 'RPI-' || LPAD(gs::text, 3, '0')
FROM generate_series(1, 40) AS gs
ON CONFLICT ("NOMBRE") DO NOTHING;

ALTER TABLE gasuber."ID-PDV-AUTOTANQUE"
  ADD COLUMN IF NOT EXISTS tarjeta_id BIGINT NULL
  REFERENCES gasuber."ID-TARJETA" (id) ON DELETE SET NULL;

ALTER TABLE gasuber."ID-PDV-ESTACION"
  ADD COLUMN IF NOT EXISTS tarjeta_id BIGINT NULL
  REFERENCES gasuber."ID-TARJETA" (id) ON DELETE SET NULL;

ALTER TABLE gasuber."ID-PDV-ALMACEN"
  ADD COLUMN IF NOT EXISTS tarjeta_id BIGINT NULL
  REFERENCES gasuber."ID-TARJETA" (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_id_pdv_autotanque_tarjeta_id
  ON gasuber."ID-PDV-AUTOTANQUE" (tarjeta_id)
  WHERE tarjeta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_id_pdv_estacion_tarjeta_id
  ON gasuber."ID-PDV-ESTACION" (tarjeta_id)
  WHERE tarjeta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_id_pdv_almacen_tarjeta_id
  ON gasuber."ID-PDV-ALMACEN" (tarjeta_id)
  WHERE tarjeta_id IS NOT NULL;

-- Raspberry actual → RPI-001: preferir autotanque Puebla T-11; si no hay fila, el autotanque con id mínimo.
UPDATE gasuber."ID-PDV-AUTOTANQUE" a
SET tarjeta_id = (SELECT id FROM gasuber."ID-TARJETA" WHERE "NOMBRE" = 'RPI-001' LIMIT 1)
WHERE a.id = COALESCE(
  (
    SELECT a2.id
    FROM gasuber."ID-PDV-AUTOTANQUE" a2
    JOIN gasuber."ID-PLANTAS" p ON p.id = a2.planta_id
    WHERE p."NOMBRE" = 'Puebla' AND a2."NUMERO" = 'T-11'
    LIMIT 1
  ),
  (SELECT MIN(id) FROM gasuber."ID-PDV-AUTOTANQUE")
);

COMMIT;
