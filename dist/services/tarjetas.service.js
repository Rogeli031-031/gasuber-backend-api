"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTarjetasRpi = listTarjetasRpi;
exports.setTarjetaActivo = setTarjetaActivo;
const db_1 = require("../config/db");
async function listTarjetasRpi() {
    const { rows } = await db_1.db.query(`SELECT id::text, "NOMBRE" AS nombre
     FROM "ID-TARJETA"
     ORDER BY "NOMBRE" ASC`);
    return rows;
}
/**
 * Asigna o quita la tarjeta RPI de un activo (columna tarjeta_id, opción B).
 */
async function setTarjetaActivo(params) {
    const aid = Number(params.activoId);
    if (!Number.isFinite(aid) || aid <= 0) {
        throw Object.assign(new Error("activo_id inválido"), { code: "VALIDATION" });
    }
    let tid = null;
    if (params.tarjetaId != null && String(params.tarjetaId).trim() !== "") {
        const n = Number(params.tarjetaId);
        if (!Number.isFinite(n) || n <= 0) {
            throw Object.assign(new Error("tarjeta_id inválido"), { code: "VALIDATION" });
        }
        tid = Math.round(n);
        const chk = await db_1.db.query(`SELECT 1 FROM "ID-TARJETA" WHERE id = $1::bigint LIMIT 1`, [
            tid,
        ]);
        if (!chk.rows.length) {
            throw Object.assign(new Error("La tarjeta no existe en ID-TARJETA"), {
                code: "VALIDATION",
            });
        }
    }
    let sql;
    switch (params.tipo) {
        case "estacion":
            sql = `UPDATE "ID-PDV-ESTACION" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
            break;
        case "almacen":
            sql = `UPDATE "ID-PDV-ALMACEN" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
            break;
        case "autotanque":
            sql = `UPDATE "ID-PDV-AUTOTANQUE" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
            break;
        default:
            throw Object.assign(new Error("tipo inválido"), { code: "VALIDATION" });
    }
    const r = await db_1.db.query(sql, [tid, aid]);
    if (!r.rows.length) {
        throw Object.assign(new Error("Activo no encontrado"), { code: "NOT_FOUND" });
    }
}
