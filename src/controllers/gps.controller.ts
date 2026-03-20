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
    const {
      unidad_id: unidadRaw,
      lat,
      lon,
      nivel,
      nivel_carburacion,
      nivel_almacen,
      velocidad_kmh,
      vel,
    } = req.body ?? {};

    const unidad_id =
      typeof unidadRaw === "string"
        ? unidadRaw.trim()
        : typeof unidadRaw === "number" && Number.isFinite(unidadRaw)
          ? String(unidadRaw)
          : "";

    if (!unidad_id) {
      return res.status(400).json({
        ok: false,
        error: "unidad_id es requerido (string, igual que unidades.clave en la BD)",
      });
    }

    const latNum = toFiniteNumber(lat);
    const lonNum = toFiniteNumber(lon);
    const nivelNum = toFiniteNumber(nivel);
    const nivelCarbNum = toFiniteNumber(nivel_carburacion);
    const nivelAlmacenNum = toFiniteNumber(nivel_almacen);
    const velRaw = velocidad_kmh ?? vel;
    const velocidadNum = toFiniteNumber(velRaw);

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

    if (
      velocidadNum !== null &&
      (velocidadNum < 0 || velocidadNum > 300)
    ) {
      return res.status(400).json({
        ok: false,
        error: "velocidad_kmh debe ser número entre 0 y 300",
      });
    }

    const exists = await unidadExists(unidad_id);
    if (!exists) {
      return res.status(400).json({
        ok: false,
        error: "unidad_id no existe en la tabla unidades",
        hint:
          "Debe coincidir exactamente con la clave de la unidad (sin espacios extra). Revisa en la consola el valor del desplegable.",
      });
    }

    const nivelFinal = hasNivel
      ? nivelNum
      : // Compatibilidad: cuando mandan dos niveles, `nivel` se toma del almacén.
        (nivelAlmacenNum as number);

    await insertGpsPoint({
      unidad_id,
      lat: latNum,
      lon: lonNum,
      nivel: nivelFinal,
      nivel_carburacion: nivelCarbNum,
      nivel_almacen: nivelAlmacenNum,
      velocidad_kmh: velocidadNum,
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error("[gps.controller] Error:", error);
    return res.status(500).json({
      ok: false,
      error: "Error guardando GPS",
    });
  }
}

