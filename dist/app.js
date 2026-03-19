"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./config/db");
const pedidos_1 = require("./routes/pedidos");
const gps_routes_1 = require("./routes/gps.routes");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Gas Uber System API running");
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
exports.default = app;
