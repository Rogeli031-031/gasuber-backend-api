import { db } from "../config/db";

export type GpsInsertInput = {
  unidad_id: string;
  lat: number;
  lon: number;
  nivel: number;
};

export async function unidadExists(unidad_id: string) {
  const { rows } = await db.query(
    `SELECT 1
     FROM unidades
     WHERE clave = $1
     LIMIT 1`,
    [unidad_id]
  );

  return rows.length > 0;
}

export async function insertGpsPoint(input: GpsInsertInput) {
  // Futuro (solo preparado): asociar gps con pedidos/servicios e historial
  const { unidad_id, lat, lon, nivel } = input;

  const { rows } = await db.query(
    `INSERT INTO gps_unidades (unidad_id, lat, lon, nivel)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [unidad_id, lat, lon, nivel]
  );

  return { id: rows[0]?.id };
}

