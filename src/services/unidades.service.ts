import { db } from "../config/db";

export type UnidadListaRow = {
  id: string;
  clave: string;
  placa: string;
  estado: string;
};

export async function listUnidadesParaConsola(): Promise<UnidadListaRow[]> {
  const { rows } = await db.query<{
    id: string;
    clave: string;
    placa: string;
    estado: string;
  }>(
    `SELECT id::text, clave, placa, estado::text
     FROM unidades
     ORDER BY clave ASC`
  );
  return rows;
}

export async function getUnidadByClave(clave: string): Promise<{
  id: string;
  clave: string;
} | null> {
  const { rows } = await db.query<{ id: string; clave: string }>(
    `SELECT id::text, clave FROM unidades WHERE clave = $1 LIMIT 1`,
    [clave]
  );
  return rows[0] ?? null;
}
