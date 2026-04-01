import path from "path";
import express from "express";
import cors from "cors";
import { db } from "./config/db";
import { pedidosRouter } from "./routes/pedidos";
import { gpsRoutes } from "./routes/gps.routes";
import { consolaRoutes } from "./routes/consola.routes";
import { whatsappRoutes } from "./routes/whatsapp.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, "../public");
app.use("/consola", express.static(path.join(publicDir, "consola")));

app.get("/", (req, res) => {
  res.type("html").send(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gas Uber API</title></head>
    <body style="font-family:system-ui;padding:1.5rem">
    <p>Gas Uber System API en ejecución.</p>
    <p><a href="/consola/">Consola web (telemetría + inicio de ruta)</a></p>
    </body></html>`
  );
});

app.get("/privacy", (req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Política de privacidad – GasUber System</title>
  </head>
  <body style="font-family: system-ui; padding: 1.5rem; line-height: 1.5">
    <h1>Política de privacidad – GasUber System</h1>
    <ul>
      <li>
        Los datos recibidos por WhatsApp se usan únicamente para procesar pedidos,
        seguimiento de rutas y atención al cliente.
      </li>
      <li>No se comparten con terceros fuera de la operación del servicio.</li>
      <li>
        La información puede almacenarse para fines de seguimiento y mejora del
        servicio.
      </li>
    </ul>
  </body>
</html>`);
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
app.use("/api/consola", consolaRoutes);
app.use("/api/whatsapp", whatsappRoutes);

export default app;
