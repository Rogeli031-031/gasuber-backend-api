import express from "express";
import { db } from "./config/db";
import { pedidosRouter } from "./routes/pedidos";
import { gpsRoutes } from "./routes/gps.routes";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Gas Uber System API running");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({
      ok: true,
      now: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    const err = error as Record<string, unknown> | null | undefined;
    const message =
      err && typeof err.message === "string" ? err.message : String(error);
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

app.use("/pedidos", pedidosRouter);
app.use("/api/gps", gpsRoutes);

export default app;
