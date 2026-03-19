"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postGps = postGps;
const gps_service_1 = require("../services/gps.service");
function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
async function postGps(req, res) {
    try {
        const { unidad_id, lat, lon, nivel } = req.body ?? {};
        if (!unidad_id || typeof unidad_id !== "string") {
            return res.status(400).json({
                ok: false,
                error: "unidad_id es requerido (string)",
            });
        }
        const latNum = toFiniteNumber(lat);
        const lonNum = toFiniteNumber(lon);
        const nivelNum = toFiniteNumber(nivel);
        if (latNum === null || lonNum === null) {
            return res.status(400).json({
                ok: false,
                error: "lat y lon deben ser números",
            });
        }
        if (nivelNum === null || nivelNum < 0 || nivelNum > 100) {
            return res.status(400).json({
                ok: false,
                error: "nivel debe ser número entre 0 y 100",
            });
        }
        const exists = await (0, gps_service_1.unidadExists)(unidad_id);
        if (!exists) {
            return res.status(400).json({
                ok: false,
                error: "unidad_id no existe",
            });
        }
        await (0, gps_service_1.insertGpsPoint)({ unidad_id, lat: latNum, lon: lonNum, nivel: nivelNum });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error("[gps.controller] Error:", error);
        return res.status(500).json({
            ok: false,
            error: "Error guardando GPS",
        });
    }
}
