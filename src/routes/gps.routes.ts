import { Router, type Request, type Response, type NextFunction } from "express";
import { postGps } from "../controllers/gps.controller";

export const gpsRoutes = Router();

/** Sin API key: comprobar que la URL del backend es correcta (DNS/HTTPS) desde la Pi. */
gpsRoutes.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gps",
    time: new Date().toISOString(),
  });
});

/**
 * Telemetría desde Raspberry: solo API_KEY_RASPBERRY (no API_KEY_CONSOLE).
 */
function requireRaspberryKey(req: Request, res: Response, next: NextFunction) {
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

gpsRoutes.post("/", requireRaspberryKey, postGps);

