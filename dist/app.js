"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const pedidos_1 = require("./routes/pedidos");
const gps_routes_1 = require("./routes/gps.routes");
const consola_routes_1 = require("./routes/consola.routes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const publicDir = path_1.default.join(__dirname, "../public");
app.use("/consola", express_1.default.static(path_1.default.join(publicDir, "consola")));
app.get("/", (req, res) => {
    res.type("html").send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gas Uber API</title></head>
    <body style="font-family:system-ui;padding:1.5rem">
    <p>Gas Uber System API en ejecución.</p>
    <p><a href="/consola/">Consola web (telemetría + inicio de ruta)</a></p>
    </body></html>`);
});
app.get("/db-test", async (req, res) => {
    try {
        const result = await db_1.db.query("SELECT NOW()");
        res.json({
            ok: true,
            now: result.rows[0],
        });
    }
    catch (error) {
        console.error(error);
        const err = error;
        const message = err && typeof err.message === "string" ? err.message : String(error);
        res.status(500).json({
            ok: false,
            error: "Error conectando a PostgreSQL",
            detail: message,
            code: err?.code,
            address: err?.address,
            port: err?.port,
        });
    }
});
app.use("/pedidos", pedidos_1.pedidosRouter);
app.use("/api/gps", gps_routes_1.gpsRoutes);
app.use("/api/consola", consola_routes_1.consolaRoutes);
exports.default = app;
