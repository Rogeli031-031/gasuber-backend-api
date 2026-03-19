import type { Request, Response } from "express";
import { insertGpsPoint, unidadExists } from "../services/gps.service";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function postGps(req: Request, res: Response) {
  try {
    const { unidad_id, lat, lon, nivel } = req.body ?? {};

    if (!unidad_id || typeof unidad_id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "unidad_id es requerido (string)",
      });
    }

    const latNum = toFiniteNumber(lat);
    const lonNum = toFiniteNumber(lon);
    const nivelNum = toFiniteNumber(nivel);

    if (latNum === null || lonNum === null) {
      return res.status(400).json({
        ok: false,
        error: "lat y lon deben ser números",
      });
    }

    if (nivelNum === null || nivelNum < 0 || nivelNum > 100) {
      return res.status(400).json({
        ok: false,
        error: "nivel debe ser número entre 0 y 100",
      });
    }

    const exists = await unidadExists(unidad_id);
    if (!exists) {
      return res.status(400).json({
        ok: false,
        error: "unidad_id no existe",
      });
    }

    await insertGpsPoint({ unidad_id, lat: latNum, lon: lonNum, nivel: nivelNum });
    return res.json({ ok: true });
  } catch (error) {
    console.error("[gps.controller] Error:", error);
    return res.status(500).json({
      ok: false,
      error: "Error guardando GPS",
    });
  }
}

