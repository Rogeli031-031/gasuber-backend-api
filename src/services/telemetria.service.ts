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

/** Estado derivado: la web solo lee DB; “vivo” = la Pi sigue enviando POST /api/gps a tiempo. */
export type EstadoRaspberry = {
  /** true si hay fila GPS y `fecha` no es más antigua que el umbral */
  recibiendo_datos: boolean;
  sin_fila_gps: boolean;
  /** segundos desde `fecha` hasta ahora; null si no hay fila o sin fecha */
  segundos_desde_ultimo_envio: number | null;
  umbral_segundos: number;
};

export type TelemetriaConEstado = {
  telemetria: TelemetriaVista;
  raspberry: EstadoRaspberry;
};

function umbralSegundos(): number {
  const raw = process.env.TELEMETRY_STALE_SECONDS;
  const n = raw ? parseInt(raw, 10) : 90;
  return Number.isFinite(n) && n > 0 ? n : 90;
}

export async function getTelemetriaPorClave(
  clave: string
): Promise<TelemetriaConEstado | null> {
  const umbral = umbralSegundos();

  const { rows } = await db.query<{
    unidad_clave: string;
    placa: string;
    lat: string;
    lon: string;
    nivel: string;
    nivel_carburacion: string | null;
    nivel_almacen: string | null;
    velocidad_kmh: string | null;
    fecha: string | null;
    gps_row_id: string | null;
    segundos_desde_ultimo: string | null;
  }>(
    `SELECT u.clave AS unidad_clave,
            u.placa,
            COALESCE(g.lat, 0)::text AS lat,
            COALESCE(g.lon, 0)::text AS lon,
            COALESCE(g.nivel, 0)::text AS nivel,
            g.nivel_carburacion::text,
            g.nivel_almacen::text,
            g.velocidad_kmh::text,
            g.fecha::text AS fecha,
            g.id::text AS gps_row_id,
            CASE
              WHEN g.fecha IS NULL THEN NULL
              ELSE EXTRACT(EPOCH FROM (NOW() - g.fecha))::text
            END AS segundos_desde_ultimo
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

  const sinFilaGps = r.gps_row_id == null || r.gps_row_id === "";
  const segundosRaw = parseNum(r.segundos_desde_ultimo);
  const segundos =
    segundosRaw !== null ? Math.max(0, Math.floor(segundosRaw)) : null;

  const recibiendo =
    !sinFilaGps &&
    r.fecha != null &&
    r.fecha.length > 0 &&
    segundos !== null &&
    segundos <= umbral;

  const telemetria: TelemetriaVista = {
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

  const raspberry: EstadoRaspberry = {
    recibiendo_datos: recibiendo,
    sin_fila_gps: sinFilaGps,
    segundos_desde_ultimo_envio: segundos,
    umbral_segundos: umbral,
  };

  return { telemetria, raspberry };
}
