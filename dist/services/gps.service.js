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
    const { unidad_id, lat, lon, nivel } = input;
    const { rows } = await db_1.db.query(`INSERT INTO gps_unidades (unidad_id, lat, lon, nivel)
     VALUES ($1, $2, $3, $4)
     RETURNING id`, [unidad_id, lat, lon, nivel]);
    return { id: rows[0]?.id };
}
