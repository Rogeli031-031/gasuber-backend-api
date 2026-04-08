import type { Request, Response } from "express";
import { insertGpsAutotanque } from "../services/gpsAutotanque.service";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function firstDefined<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/**
 * POST /api/gps — telemetría desde Raspberry.
 * Requiere `autotanque_id` (id de gasuber."ID-PDV-AUTOTANQUE") y tarjeta RPI asignada a ese autotanque.
 */
export async function postGps(req: Request, res: Response) {
  try {
    const body = req.body ?? {};
    const {
      autotanque_id: atqRaw,
      lat,
      lon,
      nivel,
      nivel_carburacion,
      nivel_almacen,
      velocidad_kmh,
      vel,
      speed,
      velocidad,
      kmh,
      speed_kmh,
    } = body as Record<string, unknown>;

    const autotanque_id =
      typeof atqRaw === "string"
        ? atqRaw.trim()
        : typeof atqRaw === "number" && Number.isFinite(atqRaw)
          ? String(Math.round(atqRaw))
          : "";

    if (!autotanque_id || !/^\d+$/.test(autotanque_id)) {
      return res.status(400).json({
        ok: false,
        error:
          "autotanque_id es requerido (id numérico de ID-PDV-AUTOTANQUE, misma fila que en la consola).",
      });
    }

    const latNum = toFiniteNumber(lat);
    const lonNum = toFiniteNumber(lon);
    const nivelNum = toFiniteNumber(nivel);
    const nivelCarbNum = toFiniteNumber(nivel_carburacion);
    const nivelAlmacenNum = toFiniteNumber(nivel_almacen);
    const velRaw = firstDefined(
      velocidad_kmh,
      vel,
      speed,
      velocidad,
      kmh,
      speed_kmh
    );
    let velocidadFinal: number;
    if (velRaw === undefined) {
      velocidadFinal = 0;
    } else {
      const velocidadNum = toFiniteNumber(velRaw);
      if (velocidadNum === null) {
        return res.status(400).json({
          ok: false,
          error:
            "velocidad inválida (número 0–300). Acepta: velocidad_kmh, vel, speed, velocidad, kmh, speed_kmh",
        });
      }
      if (velocidadNum < 0 || velocidadNum > 300) {
        return res.status(400).json({
          ok: false,
          error: "velocidad_kmh debe ser número entre 0 y 300",
        });
      }
      velocidadFinal = velocidadNum;
    }

    if (latNum === null || lonNum === null) {
      return res.status(400).json({
        ok: false,
        error: "lat y lon deben ser números",
      });
    }

    const hasNivel = nivelNum !== null;
    const hasNivelesDetallados =
      nivelCarbNum !== null && nivelAlmacenNum !== null;

    if (!hasNivel && !hasNivelesDetallados) {
      return res.status(400).json({
        ok: false,
        error:
          "debes enviar nivel o ambos: nivel_carburacion y nivel_almacen",
      });
    }

    if (hasNivel && (nivelNum < 0 || nivelNum > 100)) {
      return res.status(400).json({
        ok: false,
        error: "nivel debe ser número entre 0 y 100",
      });
    }

    if (nivelCarbNum !== null && (nivelCarbNum < 0 || nivelCarbNum > 100)) {
      return res.status(400).json({
        ok: false,
        error: "nivel_carburacion debe ser número entre 0 y 100",
      });
    }

    if (
      nivelAlmacenNum !== null &&
      (nivelAlmacenNum < 0 || nivelAlmacenNum > 100)
    ) {
      return res.status(400).json({
        ok: false,
        error: "nivel_almacen debe ser número entre 0 y 100",
      });
    }

    const nivelFinal = hasNivel
      ? nivelNum
      : (nivelAlmacenNum as number);

    try {
      await insertGpsAutotanque({
        autotanque_id,
        lat: latNum,
        lon: lonNum,
        nivel: nivelFinal,
        nivel_carburacion: nivelCarbNum,
        nivel_almacen: nivelAlmacenNum,
        velocidad_kmh: velocidadFinal,
      });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "SIN_TARJETA") {
        return res.status(403).json({
          ok: false,
          error: err.message || "Autotanque sin tarjeta RPI asignada",
        });
      }
      if (err.code === "VALIDATION") {
        return res.status(400).json({
          ok: false,
          error: err.message || "Datos inválidos",
        });
      }
      throw e;
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("[gps.controller] Error:", error);
    return res.status(500).json({
      ok: false,
      error: "Error guardando GPS",
    });
  }
}
