"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpsRoutes = void 0;
const express_1 = require("express");
const gps_controller_1 = require("../controllers/gps.controller");
exports.gpsRoutes = (0, express_1.Router)();
/**
 * Telemetría desde Raspberry: solo API_KEY_RASPBERRY (no API_KEY_CONSOLE).
 */
function requireRaspberryKey(req, res, next) {
    const expected = process.env.API_KEY_RASPBERRY;
    const provided = req.header("x-api-key");
    if (!expected) {
        return res.status(500).json({
            ok: false,
            error: "API_KEY_RASPBERRY no configurada en el servidor",
        });
    }
    if (!provided || provided !== expected) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    return next();
}
exports.gpsRoutes.post("/", requireRaspberryKey, gps_controller_1.postGps);
