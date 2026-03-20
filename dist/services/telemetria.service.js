"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTelemetriaPorClave = getTelemetriaPorClave;
const db_1 = require("../config/db");
function umbralSegundos() {
    const raw = process.env.TELEMETRY_STALE_SECONDS;
    const n = raw ? parseInt(raw, 10) : 90;
    return Number.isFinite(n) && n > 0 ? n : 90;
}
async function getTelemetriaPorClave(clave) {
    const umbral = umbralSegundos();
    const { rows } = await db_1.db.query(`SELECT u.clave AS unidad_clave,
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
     LIMIT 1`, [clave]);
    const r = rows[0];
    if (!r)
        return null;
    const parseNum = (s) => {
        if (s == null || s === "")
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    };
    const sinFilaGps = r.gps_row_id == null || r.gps_row_id === "";
    const segundosRaw = parseNum(r.segundos_desde_ultimo);
    const segundos = segundosRaw !== null ? Math.max(0, Math.floor(segundosRaw)) : null;
    const recibiendo = !sinFilaGps &&
        r.fecha != null &&
        r.fecha.length > 0 &&
        segundos !== null &&
        segundos <= umbral;
    const telemetria = {
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
    const raspberry = {
        recibiendo_datos: recibiendo,
        sin_fila_gps: sinFilaGps,
        segundos_desde_ultimo_envio: segundos,
        umbral_segundos: umbral,
    };
    return { telemetria, raspberry };
}
