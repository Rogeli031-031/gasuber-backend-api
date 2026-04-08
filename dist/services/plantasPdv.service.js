"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlantas = listPlantas;
exports.listPdvPorPlanta = listPdvPorPlanta;
const db_1 = require("../config/db");
async function listPlantas() {
    const { rows } = await db_1.db.query(`SELECT id::text, "NOMBRE" AS nombre
     FROM "ID-PLANTAS"
     ORDER BY "NOMBRE" ASC`);
    return rows;
}
async function listPdvPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT id::text, planta_id::text, "NOMBRE" AS nombre
     FROM "ID-PDV"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`, [plantaId]);
    return rows;
}
