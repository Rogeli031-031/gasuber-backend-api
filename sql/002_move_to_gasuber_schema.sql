-- Mover objetos del MVP desde public -> gasuber (si ya existen)
-- Útil si ya ejecutaste 001_init.sql antes de separar por schema.

BEGIN;

CREATE SCHEMA IF NOT EXISTS gasuber;

-- Tipos ENUM
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='pedido_estado' AND n.nspname='public')
     AND NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='pedido_estado' AND n.nspname='gasuber') THEN
    ALTER TYPE public.pedido_estado SET SCHEMA gasuber;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='servicio_estado' AND n.nspname='public')
     AND NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='servicio_estado' AND n.nspname='gasuber') THEN
    ALTER TYPE public.servicio_estado SET SCHEMA gasuber;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='unidad_estado' AND n.nspname='public')
     AND NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='unidad_estado' AND n.nspname='gasuber') THEN
    ALTER TYPE public.unidad_estado SET SCHEMA gasuber;
  END IF;
END $$;

-- Tablas (orden importa por FKs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pedidos')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gasuber' AND table_name='pedidos') THEN
    ALTER TABLE public.pedidos SET SCHEMA gasuber;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='operadores')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gasuber' AND table_name='operadores') THEN
    ALTER TABLE public.operadores SET SCHEMA gasuber;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='unidades')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gasuber' AND table_name='unidades') THEN
    ALTER TABLE public.unidades SET SCHEMA gasuber;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='servicios')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='gasuber' AND table_name='servicios') THEN
    ALTER TABLE public.servicios SET SCHEMA gasuber;
  END IF;
END $$;

COMMIT;

