import { Router, type Request, type Response, type NextFunction } from "express";
import { postGps } from "../controllers/gps.controller";

export const gpsRoutes = Router();

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

