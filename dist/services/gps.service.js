"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unidadExists = unidadExists;
exports.insertGpsPoint = insertGpsPoint;
const db_1 = require("../config/db");
async function unidadExists(unidad_id) {
    const { rows } = await db_1.db.query(`SELECT 1
     FROM unidades
     WHERE clave = $1
     LIMIT 1`, [unidad_id]);
    return rows.length > 0;
}
async function insertGpsPoint(input) {
    // Futuro (solo preparado): asociar gps con pedidos/servicios e historial
    const { unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, } = input;
    const { rows } = await db_1.db.query(`INSERT INTO gps_unidades (unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (unidad_id)
     DO UPDATE SET
       lat = EXCLUDED.lat,
       lon = EXCLUDED.lon,
       nivel = EXCLUDED.nivel,
       nivel_carburacion = EXCLUDED.nivel_carburacion,
       nivel_almacen = EXCLUDED.nivel_almacen,
       velocidad_kmh = EXCLUDED.velocidad_kmh,
       fecha = NOW()
     RETURNING id`, [unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh]);
    return { id: rows[0]?.id };
}
