BEGIN;

SET search_path TO gasuber, public;

CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  unidad_db_id BIGINT NULL REFERENCES unidades(id) ON DELETE SET NULL,
  estado_anterior pedido_estado NOT NULL,
  estado_nuevo pedido_estado NOT NULL,
  razon_cancelacion TEXT NULL,
  nivel_carburacion NUMERIC NULL,
  nivel_almacen NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_estado_historial_pedido_id_created
  ON pedido_estado_historial (pedido_id, created_at DESC);

COMMIT;

