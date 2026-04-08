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
    const { rows } = await db_1.db.query(`SELECT e.id::text,
            e.planta_id::text,
            e."NOMBRE" AS nombre,
            e."TANQUE"::text AS tanque,
            e."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-ESTACION" e
     LEFT JOIN "ID-TARJETA" t ON t.id = e.tarjeta_id
     WHERE e.planta_id = $1::bigint
     ORDER BY e."NOMBRE" ASC`, [plantaId]);
    return rows;
}
async function listAlmacenesPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT a.id::text,
            a.planta_id::text,
            a."NOMBRE" AS nombre,
            a."TANQUE"::text AS tanque,
            a."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-ALMACEN" a
     LEFT JOIN "ID-TARJETA" t ON t.id = a.tarjeta_id
     WHERE a.planta_id = $1::bigint
     ORDER BY a."NOMBRE" ASC`, [plantaId]);
    return rows;
}
async function listAutotanquesPorPlanta(plantaId) {
    const { rows } = await db_1.db.query(`SELECT atq.id::text,
            atq.planta_id::text,
            atq."NUMERO"::text AS numero,
            atq."MARCA"::text AS marca,
            atq."MODELO"::text AS modelo,
            atq."SERIE"::text AS serie,
            atq."PLACAS"::text AS placas,
            atq."CAPACIDAD"::text AS capacidad,
            t.id::text AS tarjeta_id,
            t."NOMBRE" AS tarjeta_nombre
     FROM "ID-PDV-AUTOTANQUE" atq
     LEFT JOIN "ID-TARJETA" t ON t.id = atq.tarjeta_id
     WHERE atq.planta_id = $1::bigint
     ORDER BY atq."NUMERO" ASC`, [plantaId]);
    return rows;
}
