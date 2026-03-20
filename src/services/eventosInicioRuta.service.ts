import { db } from "../config/db";

export type EventoInicioRutaInsert = {
  unidad_db_id: string;
  unidad_clave: string;
  lat: number;
  lon: number;
  nivel: number;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
  velocidad_kmh: number | null;
  satelites: number | null;
  gps_fix: boolean | null;
};

export type EventoInicioRutaRow = EventoInicioRutaInsert & {
  id: string;
  created_at: string;
};

function mapEventoRow(r: Record<string, unknown>): EventoInicioRutaRow {
  const num = (v: unknown) =>
    v == null || v === "" ? null : Number(v as string | number);
  return {
    id: String(r.id),
    unidad_db_id: String(r.unidad_db_id),
    unidad_clave: String(r.unidad_clave),
    lat: Number(r.lat),
    lon: Number(r.lon),
    nivel: Number(r.nivel),
    nivel_carburacion: num(r.nivel_carburacion),
    nivel_almacen: num(r.nivel_almacen),
    velocidad_kmh: num(r.velocidad_kmh),
    satelites: num(r.satelites),
    gps_fix:
      r.gps_fix === null || r.gps_fix === undefined
        ? null
        : Boolean(r.gps_fix),
    created_at: String(r.created_at),
  };
}

export async function insertEventoInicioRuta(
  input: EventoInicioRutaInsert
): Promise<EventoInicioRutaRow> {
  const { rows } = await db.query(
    `INSERT INTO eventos_inicio_ruta (
       unidad_db_id, unidad_clave, lat, lon, nivel,
       nivel_carburacion, nivel_almacen, velocidad_kmh,
       satelites, gps_fix
     )
     VALUES ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, unidad_db_id, unidad_clave, lat, lon, nivel,
       nivel_carburacion, nivel_almacen, velocidad_kmh, satelites, gps_fix, created_at`,
    [
      input.unidad_db_id,
      input.unidad_clave,
      input.lat,
      input.lon,
      input.nivel,
      input.nivel_carburacion,
      input.nivel_almacen,
      input.velocidad_kmh,
      input.satelites,
      input.gps_fix,
    ]
  );

  const r = rows[0];
  if (!r) throw new Error("insertEventoInicioRuta: sin fila");

  return mapEventoRow(r as Record<string, unknown>);
}

export async function listEventosPorClave(
  clave: string,
  limit: number
): Promise<EventoInicioRutaRow[]> {
  const lim = Math.min(Math.max(1, limit), 200);
  const { rows } = await db.query(
    `SELECT id, unidad_db_id, unidad_clave, lat, lon, nivel,
            nivel_carburacion, nivel_almacen, velocidad_kmh, satelites, gps_fix, created_at
     FROM eventos_inicio_ruta
     WHERE unidad_clave = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [clave, lim]
  );

  return rows.map((r) => mapEventoRow(r as Record<string, unknown>));
}
