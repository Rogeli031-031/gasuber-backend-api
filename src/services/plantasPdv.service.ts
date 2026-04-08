import { db } from "../config/db";

export type PlantaRow = {
  id: string;
  nombre: string;
};

export type PdvRow = {
  id: string;
  planta_id: string;
  nombre: string;
};

export type EstacionRow = {
  id: string;
  planta_id: string;
  nombre: string;
  tanque: string;
  capacidad: string;
  tarjeta_id: string | null;
  tarjeta_nombre: string | null;
};

export type AlmacenRow = {
  id: string;
  planta_id: string;
  nombre: string;
  tanque: string;
  capacidad: string;
  tarjeta_id: string | null;
  tarjeta_nombre: string | null;
};

export type AutotanqueRow = {
  id: string;
  planta_id: string;
  numero: string;
  marca: string;
  modelo: string;
  serie: string;
  placas: string;
  capacidad: string;
  tarjeta_id: string | null;
  tarjeta_nombre: string | null;
};

export async function listPlantas(): Promise<PlantaRow[]> {
  const { rows } = await db.query<{ id: string; nombre: string }>(
    `SELECT id::text, "NOMBRE" AS nombre
     FROM "ID-PLANTAS"
     ORDER BY "NOMBRE" ASC`
  );
  return rows;
}

export async function listPdvPorPlanta(plantaId: string): Promise<PdvRow[]> {
  const { rows } = await db.query<{
    id: string;
    planta_id: string;
    nombre: string;
  }>(
    `SELECT id::text, planta_id::text, "NOMBRE" AS nombre
     FROM "ID-PDV"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`,
    [plantaId]
  );
  return rows;
}

export async function listEstacionesPorPlanta(
  plantaId: string
): Promise<EstacionRow[]> {
  const { rows } = await db.query<{
    id: string;
    planta_id: string;
    nombre: string;
    tanque: string;
    capacidad: string;
    tarjeta_id: string | null;
    tarjeta_nombre: string | null;
  }>(
    `SELECT e.id::text,
            e.planta_id::text,
            e."NOMBRE" AS nombre,
            e."TANQUE"::text AS tanque,
            e."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-ESTACION" e
     LEFT JOIN "ID-TARJETA" t ON t.id = e.tarjeta_id
     WHERE e.planta_id = $1::bigint
     ORDER BY e."NOMBRE" ASC`,
    [plantaId]
  );
  return rows;
}

export async function listAlmacenesPorPlanta(
  plantaId: string
): Promise<AlmacenRow[]> {
  const { rows } = await db.query<{
    id: string;
    planta_id: string;
    nombre: string;
    tanque: string;
    capacidad: string;
    tarjeta_id: string | null;
    tarjeta_nombre: string | null;
  }>(
    `SELECT a.id::text,
            a.planta_id::text,
            a."NOMBRE" AS nombre,
            a."TANQUE"::text AS tanque,
            a."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-ALMACEN" a
     LEFT JOIN "ID-TARJETA" t ON t.id = a.tarjeta_id
     WHERE a.planta_id = $1::bigint
     ORDER BY a."NOMBRE" ASC`,
    [plantaId]
  );
  return rows;
}

export async function listAutotanquesPorPlanta(
  plantaId: string
): Promise<AutotanqueRow[]> {
  const { rows } = await db.query<{
    id: string;
    planta_id: string;
    numero: string;
    marca: string;
    modelo: string;
    serie: string;
    placas: string;
    capacidad: string;
    tarjeta_id: string | null;
    tarjeta_nombre: string | null;
  }>(
    `SELECT atq.id::text,
            atq.planta_id::text,
            atq."NUMERO"::text AS numero,
            atq."MARCA"::text AS marca,
            atq."MODELO"::text AS modelo,
            atq."SERIE"::text AS serie,
            atq."PLACAS"::text AS placas,
            atq."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-AUTOTANQUE" atq
     LEFT JOIN "ID-TARJETA" t ON t.id = atq.tarjeta_id
     WHERE atq.planta_id = $1::bigint
     ORDER BY atq."NUMERO" ASC`,
    [plantaId]
  );
  return rows;
}
