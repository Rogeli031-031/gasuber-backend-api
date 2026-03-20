"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnidadesConsola = getUnidadesConsola;
exports.getTelemetriaConsola = getTelemetriaConsola;
exports.getEventosConsola = getEventosConsola;
exports.postInicioRuta = postInicioRuta;
const unidades_service_1 = require("../services/unidades.service");
const telemetria_service_1 = require("../services/telemetria.service");
const eventosInicioRuta_service_1 = require("../services/eventosInicioRuta.service");
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
function toIntOrNull(value) {
    const n = toFiniteNumber(value);
    if (n === null)
        return null;
    return Math.round(n);
}
async function getUnidadesConsola(_req, res) {
    try {
        const unidades = await (0, unidades_service_1.listUnidadesParaConsola)();
        return res.json({ ok: true, unidades });
    }
    catch (error) {
        console.error("[consola] getUnidades:", error);
        return res.status(500).json({ ok: false, error: "Error listando unidades" });
    }
}
async function getTelemetriaConsola(req, res) {
    try {
        const clave = req.params.clave;
        if (!clave || typeof clave !== "string") {
            return res.status(400).json({ ok: false, error: "clave inválida" });
        }
        const data = await (0, telemetria_service_1.getTelemetriaPorClave)(clave);
        if (!data) {
            return res.status(404).json({ ok: false, error: "unidad no encontrada" });
        }
        return res.json({
            ok: true,
            telemetria: data.telemetria,
            raspberry: data.raspberry,
        });
    }
    catch (error) {
        console.error("[consola] getTelemetria:", error);
        return res.status(500).json({ ok: false, error: "Error leyendo telemetría" });
    }
}
async function getEventosConsola(req, res) {
    try {
        const clave = req.query.unidad_clave;
        if (!clave || typeof clave !== "string") {
            return res.status(400).json({
                ok: false,
                error: "query unidad_clave requerido",
            });
        }
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 50);
        const eventos = await (0, eventosInicioRuta_service_1.listEventosPorClave)(clave, Number.isFinite(limit) ? limit : 50);
        return res.json({ ok: true, eventos });
    }
    catch (error) {
        console.error("[consola] getEventos:", error);
        return res.status(500).json({ ok: false, error: "Error listando eventos" });
    }
}
async function postInicioRuta(req, res) {
    try {
        const { unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, satelites, gps_fix, } = req.body ?? {};
        if (!unidad_id || typeof unidad_id !== "string") {
            return res.status(400).json({
                ok: false,
                error: "unidad_id (clave) es requerido",
            });
        }
        const unidad = await (0, unidades_service_1.getUnidadByClave)(unidad_id);
        if (!unidad) {
            return res.status(400).json({
                ok: false,
                error: "unidad_id no existe",
            });
        }
        const latNum = toFiniteNumber(lat);
        const lonNum = toFiniteNumber(lon);
        const nivelNum = toFiniteNumber(nivel);
        const nivelCarb = toFiniteNumber(nivel_carburacion);
        const nivelAlm = toFiniteNumber(nivel_almacen);
        const vel = toFiniteNumber(velocidad_kmh);
        if (latNum === null || lonNum === null) {
            return res.status(400).json({
                ok: false,
                error: "lat y lon deben ser números (use 0 si no hay fix)",
            });
        }
        if (nivelNum === null) {
            return res.status(400).json({
                ok: false,
                error: "nivel es requerido (número)",
            });
        }
        if (nivelNum < 0 || nivelNum > 100) {
            return res.status(400).json({
                ok: false,
                error: "nivel debe estar entre 0 y 100",
            });
        }
        if (nivelCarb !== null && (nivelCarb < 0 || nivelCarb > 100)) {
            return res.status(400).json({
                ok: false,
                error: "nivel_carburacion debe estar entre 0 y 100",
            });
        }
        if (nivelAlm !== null && (nivelAlm < 0 || nivelAlm > 100)) {
            return res.status(400).json({
                ok: false,
                error: "nivel_almacen debe estar entre 0 y 100",
            });
        }
        if (vel !== null && (vel < 0 || vel > 300)) {
            return res.status(400).json({
                ok: false,
                error: "velocidad_kmh debe estar entre 0 y 300",
            });
        }
        const sats = satelites === undefined ? 0 : toIntOrNull(satelites) ?? 0;
        const fix = gps_fix === undefined || gps_fix === null
            ? false
            : Boolean(gps_fix);
        const evento = await (0, eventosInicioRuta_service_1.insertEventoInicioRuta)({
            unidad_db_id: unidad.id,
            unidad_clave: unidad.clave,
            lat: latNum,
            lon: lonNum,
            nivel: nivelNum,
            nivel_carburacion: nivelCarb,
            nivel_almacen: nivelAlm,
            velocidad_kmh: vel,
            satelites: sats,
            gps_fix: fix,
        });
        return res.status(201).json({
            ok: true,
            mensaje: "Inicio de ruta",
            evento,
        });
    }
    catch (error) {
        console.error("[consola] postInicioRuta:", error);
        return res.status(500).json({
            ok: false,
            error: "Error guardando evento",
        });
    }
}
