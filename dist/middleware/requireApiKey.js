"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
/**
 * Acepta API_KEY_CONSOLE o, si no existe, API_KEY_RASPBERRY (misma clave para Pi y consola web).
 */
function requireApiKey(req, res, next) {
    const expected = process.env.API_KEY_CONSOLE || process.env.API_KEY_RASPBERRY;
    const provided = req.header("x-api-key");
    if (!expected) {
        return res.status(500).json({
            ok: false,
            error: "API_KEY_CONSOLE o API_KEY_RASPBERRY no configurada en el servidor",
        });
    }
    if (!provided || provided !== expected) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    return next();
}
