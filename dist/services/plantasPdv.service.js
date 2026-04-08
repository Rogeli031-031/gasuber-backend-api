"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlantas = listPlantas;
exports.listPdvPorPlanta = listPdvPorPlanta;
exports.listEstacionesPorPlanta = listEstacionesPorPlanta;
exports.listAlmacenesPorPlanta = listAlmacenesPorPlanta;
exports.listAutotanquesPorPlanta = listAutotanquesPorPlanta;
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
async function listEstacionesPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT id::text,
            planta_id::text,
            "NOMBRE" AS nombre,
            "TANQUE"::text AS tanque,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-ESTACION"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`, [plantaId]);
    return rows;
}
async function listAlmacenesPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT id::text,
            planta_id::text,
            "NOMBRE" AS nombre,
            "TANQUE"::text AS tanque,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-ALMACEN"
     WHERE planta_id = $1::bigint
     ORDER BY "NOMBRE" ASC`, [plantaId]);
    return rows;
}
async function listAutotanquesPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT id::text,
            planta_id::text,
            "NUMERO"::text AS numero,
            "MARCA"::text AS marca,
            "MODELO"::text AS modelo,
            "SERIE"::text AS serie,
            "PLACAS"::text AS placas,
            "CAPACIDAD"::text AS capacidad
     FROM "ID-PDV-AUTOTANQUE"
     WHERE planta_id = $1::bigint
     ORDER BY "NUMERO" ASC`, [plantaId]);
    return rows;
}
