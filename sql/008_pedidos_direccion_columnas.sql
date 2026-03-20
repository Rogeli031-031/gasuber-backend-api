BEGIN;

SET search_path TO gasuber, public;

-- Direccion y tipo de origen (Casa/Empresa) para completar solicitudes.
-- Se dejan como nullable para no romper pedidos históricos existentes.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS colonia TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS calle TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cp INTEGER;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_exterior TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_interior TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_origen TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nombre_empresa TEXT;

COMMIT;

