import { db } from "../config/db";

export type GpsAutotanqueInput = {
  autotanque_id: string;
  lat: number;
  lon: number;
  nivel: number;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
  velocidad_kmh: number;
};

/** Solo acepta GPS si el autotanque existe y tiene tarjeta RPI asignada. */
export async function insertGpsAutotanque(input: GpsAutotanqueInput): Promise<{ autotanque_id: string }> {
  const aid = Number(input.autotanque_id);
  if (!Number.isFinite(aid) || aid <= 0) {
    throw Object.assign(new Error("autotanque_id inválido"), { code: "VALIDATION" });
  }

  const { rows: chk } = await db.query<{ tarjeta_id: string | null }>(
    `SELECT tarjeta_id::text AS tarjeta_id
     FROM "ID-PDV-AUTOTANQUE"
     WHERE id = $1::bigint
     LIMIT 1`,
    [aid]
  );
  if (!chk.length) {
    throw Object.assign(new Error("autotanque_id no existe en ID-PDV-AUTOTANQUE"), {
      code: "VALIDATION",
    });
  }
  if (chk[0].tarjeta_id == null || chk[0].tarjeta_id === "") {
    throw Object.assign(
      new Error(
        "Este autotanque no tiene tarjeta Raspberry asignada; la consola debe asignar una en ID-TARJETA antes de recibir GPS."
      ),
      { code: "SIN_TARJETA" }
    );
  }

  const { rows } = await db.query<{ autotanque_id: string }>(
    `INSERT INTO gps_autotanque (
       autotanque_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, fecha
     )
     VALUES ($1::bigint, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (autotanque_id)
     DO UPDATE SET
       lat = EXCLUDED.lat,
       lon = EXCLUDED.lon,
       nivel = EXCLUDED.nivel,
       nivel_carburacion = EXCLUDED.nivel_carburacion,
       nivel_almacen = EXCLUDED.nivel_almacen,
       velocidad_kmh = EXCLUDED.velocidad_kmh,
       fecha = NOW()
     RETURNING autotanque_id`,
    [
      aid,
      input.lat,
      input.lon,
      input.nivel,
      input.nivel_carburacion,
      input.nivel_almacen,
      input.velocidad_kmh,
    ]
  );

  return { autotanque_id: rows[0]?.autotanque_id ?? String(aid) };
}
