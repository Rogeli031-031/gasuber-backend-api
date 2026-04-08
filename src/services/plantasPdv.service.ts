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
};

export type AlmacenRow = {
  id: string;
  planta_id: string;
  nombre: string;
  tanque: string;
  capacidad: string;
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
  }>(
    `SELECT id::text,
            planta_id::text,
            "NOMBRE" AS nombre,
            "TANQUE"::text AS tanque,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-ESTACION"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`,
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
  }>(
    `SELECT id::text,
            planta_id::text,
            "NOMBRE" AS nombre,
            "TANQUE"::text AS tanque,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-ALMACEN"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`,
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
  }>(
    `SELECT id::text,
            planta_id::text,
            "NUMERO"::text AS numero,
            "MARCA"::text AS marca,
            "MODELO"::text AS modelo,
            "SERIE"::text AS serie,
            "PLACAS"::text AS placas,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-AUTOTANQUE"
     WHERE planta_id = $1::bigint
     ORDER BY "NUMERO" ASC`,
    [plantaId]
  );
  return rows;
}
