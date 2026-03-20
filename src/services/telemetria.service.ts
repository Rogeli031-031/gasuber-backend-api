import { db } from "../config/db";

export type TelemetriaVista = {
  unidad_clave: string;
  placa: string;
  lat: number;
  lon: number;
  nivel: number;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
  velocidad_kmh: number | null;
  fecha: string | null;
};

export async function getTelemetriaPorClave(
  clave: string
): Promise<TelemetriaVista | null> {
  const { rows } = await db.query<{
    unidad_clave: string;
    placa: string;
    lat: string;
    lon: string;
    nivel: string;
    nivel_carburacion: string | null;
    nivel_almacen: string | null;
    velocidad_kmh: string | null;
    fecha: string;
  }>(
    `SELECT u.clave AS unidad_clave,
            u.placa,
            COALESCE(g.lat, 0)::text AS lat,
            COALESCE(g.lon, 0)::text AS lon,
            COALESCE(g.nivel, 0)::text AS nivel,
            g.nivel_carburacion::text,
            g.nivel_almacen::text,
            g.velocidad_kmh::text,
            g.fecha::text AS fecha
     FROM unidades u
     LEFT JOIN gps_unidades g ON g.unidad_id = u.clave
     WHERE u.clave = $1
     LIMIT 1`,
    [clave]
  );

  const r = rows[0];
  if (!r) return null;

  const parseNum = (s: string | null | undefined): number | null => {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return {
    unidad_clave: r.unidad_clave,
    placa: r.placa,
    lat: parseNum(r.lat) ?? 0,
    lon: parseNum(r.lon) ?? 0,
    nivel: parseNum(r.nivel) ?? 0,
    nivel_carburacion: parseNum(r.nivel_carburacion),
    nivel_almacen: parseNum(r.nivel_almacen),
    velocidad_kmh: parseNum(r.velocidad_kmh),
    fecha: r.fecha && r.fecha.length > 0 ? r.fecha : null,
  };
}
