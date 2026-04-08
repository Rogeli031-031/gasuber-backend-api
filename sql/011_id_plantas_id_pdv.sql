BEGIN;

SET search_path TO gasuber, public;

-- Tablas con los nombres indicados por negocio (identificadores entre comillas en PostgreSQL).
CREATE TABLE IF NOT EXISTS "ID-PLANTAS" (
  id BIGSERIAL PRIMARY KEY,
  "NOMBRE" TEXT NOT NULL,
  CONSTRAINT uq_id_plantas_nombre UNIQUE ("NOMBRE")
);

CREATE TABLE IF NOT EXISTS "ID-PDV" (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL REFERENCES "ID-PLANTAS" (id) ON DELETE CASCADE,
  "NOMBRE" TEXT NOT NULL,
  CONSTRAINT uq_id_pdv_planta_nombre UNIQUE (planta_id, "NOMBRE")
);

CREATE INDEX IF NOT EXISTS idx_id_pdv_planta ON "ID-PDV" (planta_id);

-- Datos iniciales (idempotente): plantas y tres PDV por cada planta.
INSERT INTO "ID-PLANTAS" ("NOMBRE")
VALUES
  ('Puebla'),
  ('Tehuacan'),
  ('Queretaro'),
  ('San luis'),
  ('Acapulco'),
  ('Morelos')
ON CONFLICT ("NOMBRE") DO NOTHING;

INSERT INTO "ID-PDV" (planta_id, "NOMBRE")
SELECT p.id, v.tipo
FROM "ID-PLANTAS" p
CROSS JOIN (
  VALUES
    ('ESTACION'),
    ('AUTOTANQUE'),
    ('ALMACEN')
) AS v(tipo)
ON CONFLICT (planta_id, "NOMBRE") DO NOTHING;

COMMIT;
