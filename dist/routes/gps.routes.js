"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpsRoutes = void 0;
const express_1 = require("express");
const gps_controller_1 = require("../controllers/gps.controller");
exports.gpsRoutes = (0, express_1.Router)();
function requireApiKey(req, res) {
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
    return null;
}
exports.gpsRoutes.post("/", (req, res) => {
    const authResponse = requireApiKey(req, res);
    if (authResponse)
        return;
    return (0, gps_controller_1.postGps)(req, res);
});
