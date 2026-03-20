"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUnidadesParaConsola = listUnidadesParaConsola;
exports.getUnidadByClave = getUnidadByClave;
const db_1 = require("../config/db");
async function listUnidadesParaConsola() {
    const { rows } = await db_1.db.query(`SELECT id::text, clave, placa, estado::text
     FROM unidades
     ORDER BY clave ASC`);
    return rows;
}
async function getUnidadByClave(clave) {
    const { rows } = await db_1.db.query(`SELECT id::text, clave FROM unidades WHERE clave = $1 LIMIT 1`, [clave]);
    return rows[0] ?? null;
}
