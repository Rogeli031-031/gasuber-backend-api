-- MVP base schema (sin IA, simple y escalable)
-- Ejecutar en PostgreSQL

BEGIN;

CREATE SCHEMA IF NOT EXISTS gasuber;
SET search_path TO gasuber, public;

-- Tipos ENUM para estados (claros y validados)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedido_estado') THEN
    CREATE TYPE pedido_estado AS ENUM (
      'recibido',
      'validando',
      'confirmado',
      'cancelado',
      'convertido_servicio'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'servicio_estado') THEN
    CREATE TYPE servicio_estado AS ENUM (
      'pendiente',
      'asignado',
      'en_ruta',
      'en_sitio',
      'descargando',
      'finalizado',
      'cancelado',
      'incidencia'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidad_estado') THEN
    CREATE TYPE unidad_estado AS ENUM (
      'disponible',
      'asignada',
      'en_ruta',
      'en_servicio',
      'pausada',
      'fuera_de_operacion',
      'sin_senal'
    );
  END IF;
END $$;

-- Operadores
CREATE TABLE IF NOT EXISTS operadores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unidades
CREATE TABLE IF NOT EXISTS unidades (
  id BIGSERIAL PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  placa TEXT NOT NULL UNIQUE,
  capacidad_litros INTEGER NOT NULL CHECK (capacidad_litros > 0),
  estado unidad_estado NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  telefono_origen TEXT NOT NULL,
  cliente_nombre TEXT NULL,
  direccion_texto TEXT NOT NULL,
  litros_solicitados NUMERIC(10,2) NULL CHECK (litros_solicitados IS NULL OR litros_solicitados > 0),
  estado pedido_estado NOT NULL DEFAULT 'recibido',
  prioridad SMALLINT NOT NULL DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_created_at ON pedidos (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos (created_at DESC);

-- Servicios
CREATE TABLE IF NOT EXISTS servicios (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  unidad_id BIGINT NULL REFERENCES unidades(id) ON DELETE SET NULL,
  operador_id BIGINT NULL REFERENCES operadores(id) ON DELETE SET NULL,
  estado servicio_estado NOT NULL DEFAULT 'pendiente',
  hora_asignacion TIMESTAMPTZ NULL,
  hora_inicio TIMESTAMPTZ NULL,
  hora_fin TIMESTAMPTZ NULL,
  observaciones TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicios_pedido_id ON servicios (pedido_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado_created_at ON servicios (estado, created_at DESC);

COMMIT;

