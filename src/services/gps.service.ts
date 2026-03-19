import { db } from "../config/db";

export type GpsInsertInput = {
  unidad_id: string;
  lat: number;
  lon: number;
  nivel: number;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
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
  const { unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen } = input;

  const { rows } = await db.query(
    `INSERT INTO gps_unidades (unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (unidad_id)
     DO UPDATE SET
       lat = EXCLUDED.lat,
       lon = EXCLUDED.lon,
       nivel = EXCLUDED.nivel,
       nivel_carburacion = EXCLUDED.nivel_carburacion,
       nivel_almacen = EXCLUDED.nivel_almacen,
       fecha = NOW()
     RETURNING id`,
    [unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen]
  );

  return { id: rows[0]?.id };
}

