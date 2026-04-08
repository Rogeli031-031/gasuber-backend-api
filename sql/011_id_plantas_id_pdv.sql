-- Plantas y PDV (consola). Ejecutar una vez en la base donde vive el esquema gasuber.
-- En pgAdmin: Query Tool → pegar todo → Execute (F5).
-- O desde la carpeta backend-api: node scripts/migrate.cjs --file=sql/011_id_plantas_id_pdv.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."ID-PLANTAS" (
  id BIGSERIAL PRIMARY KEY,
  "NOMBRE" TEXT NOT NULL,
  CONSTRAINT uq_id_plantas_nombre UNIQUE ("NOMBRE")
);

CREATE TABLE IF NOT EXISTS gasuber."ID-PDV" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES gasuber."ID-PLANTAS" (id) ON DELETE CASCADE,
  "NOMBRE" TEXT NOT NULL,
  CONSTRAINT uq_id_pdv_planta_nombre UNIQUE (planta_id, "NOMBRE")
);

CREATE INDEX IF NOT EXISTS idx_id_pdv_planta ON gasuber."ID-PDV" (planta_id);

INSERT INTO gasuber."ID-PLANTAS" ("NOMBRE")
VALUES
  ('Puebla'),
  ('Tehuacan'),
  ('Queretaro'),
  ('San luis'),
  ('Acapulco'),
  ('Morelos')
ON CONFLICT ("NOMBRE") DO NOTHING;

INSERT INTO gasuber."ID-PDV" (planta_id, "NOMBRE")
SELECT p.id, v.tipo
FROM gasuber."ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('ESTACION'),
    ('AUTOTANQUE'),
    ('ALMACEN')
) AS v(tipo)
ON CONFLICT (planta_id, "NOMBRE") DO NOTHING;

COMMIT;
