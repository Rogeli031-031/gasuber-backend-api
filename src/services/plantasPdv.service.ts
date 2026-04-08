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
