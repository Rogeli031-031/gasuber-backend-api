-- Alarmas (consola / expediente autotanque, telemetría, etc.)
-- CLI: node scripts/migrate.cjs --file=sql/022_alarmas.sql

BEGIN;

CREATE TABLE IF NOT EXISTS gasuber."Alarmas" (
  id BIGSERIAL PRIMARY KEY,
  autotanque_id BIGINT NOT NULL REFERENCES gasuber."ID-PDV-AUTOTANQUE" (id) ON DELETE CASCADE,
  unidad_clave TEXT,
  tipo TEXT NOT NULL,
  umbral_kmh NUMERIC(8, 2),
  velocidad_kmh NUMERIC(8, 2),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  origen TEXT NOT NULL DEFAULT 'sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at TIMESTAMPTZ,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_alarmas_autotanque_activa
  ON gasuber."Alarmas" (autotanque_id)
  WHERE activa = TRUE;

CREATE INDEX IF NOT EXISTS idx_alarmas_origen_activa
  ON gasuber."Alarmas" (origen, activa);

COMMIT;
