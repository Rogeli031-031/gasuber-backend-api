import type { Request, Response } from "express";
import axios from "axios";
import { getUnidadByClave, listUnidadesParaConsola } from "../services/unidades.service";
import { getTelemetriaPorClave } from "../services/telemetria.service";
import {
  insertEventoInicioRuta,
  listEventosPorClave,
} from "../services/eventosInicioRuta.service";
import {
  insertPedido,
  listPedidosParaConsolaUnidad,
  avanzarPedidoEstado,
  cancelarPedido,
} from "../services/pedidos.service";
import { sendWhatsAppTextMessage } from "../services/whatsapp.service";
import {
  listPlantas,
  listPdvPorPlanta,
  listEstacionesPorPlanta,
} from "../services/plantasPdv.service";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toIntOrNull(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  return Math.round(n);
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

function normalizeNA(value: string): string {
  return value.trim().toUpperCase() === "N/A" ? "N/A" : value.trim();
}

function normalizeTipoOrigen(value: unknown): "casa" | "empresa" | null {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (s === "casa") return "casa";
  if (s === "empresa") return "empresa";
  return null;
}

function normalizeCpToInt(cpRaw: unknown): number | null {
  const s =
    typeof cpRaw === "number" && Number.isFinite(cpRaw)
      ? String(Math.trunc(cpRaw))
      : typeof cpRaw === "string"
        ? cpRaw.trim()
        : "";

  if (!s) return null;

  // Acepta:
  // - "647489"
  // - "CP647489"
  // - "CP 647489" (exactamente un espacio)
  const digitsOnly = s.match(/^\d+$/);
  const cpWithPrefix = s.match(/^CP ?(\d+)$/i);

  const digits = digitsOnly ? digitsOnly[0] : cpWithPrefix ? cpWithPrefix[1] : null;
  if (!digits) return null;

  const n = Number(digits);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function parseLitrosEnteroPositivo(litrosRaw: unknown): number | null {
  const n =
    typeof litrosRaw === "number"
      ? litrosRaw
      : typeof litrosRaw === "string"
        ? Number(litrosRaw.trim())
        : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function prioridadDesdeLitros(litros: number): number {
  if (litros >= 1001) return 5; // Alta
  if (litros >= 201) return 3; // Media
  return 1; // Baja (1..200)
}

export async function getUnidadesConsola(_req: Request, res: Response) {
  try {
    const unidades = await listUnidadesParaConsola();
    return res.json({ ok: true, unidades });
  } catch (error) {
    console.error("[consola] getUnidades:", error);
    return res.status(500).json({ ok: false, error: "Error listando unidades" });
  }
}

export async function getPlantasConsola(_req: Request, res: Response) {
  try {
    const plantas = await listPlantas();
    return res.json({ ok: true, plantas });
  } catch (error) {
    console.error("[consola] getPlantas:", error);
    const pg = error as { code?: string };
    if (pg.code === "42P01") {
      return res.status(500).json({
        ok: false,
        error: "No existen las tablas ID-PLANTAS / ID-PDV en PostgreSQL.",
        hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/011_id_plantas_id_pdv.sql",
      });
    }
    return res.status(500).json({ ok: false, error: "Error listando plantas" });
  }
}

export async function getPdvConsola(req: Request, res: Response) {
  try {
    const plantaIdRaw = req.query.planta_id;
    const plantaId =
      typeof plantaIdRaw === "string"
        ? plantaIdRaw.trim()
        : plantaIdRaw != null
          ? String(plantaIdRaw).trim()
          : "";
    if (!plantaId || !/^\d+$/.test(plantaId)) {
      return res.status(400).json({
        ok: false,
        error: "query planta_id requerido (id numérico de la planta)",
      });
    }

    const pdvs = await listPdvPorPlanta(plantaId);
    return res.json({ ok: true, pdvs });
  } catch (error) {
    console.error("[consola] getPdv:", error);
    const pg = error as { code?: string };
    if (pg.code === "42P01") {
      return res.status(500).json({
        ok: false,
        error: "No existen las tablas ID-PLANTAS / ID-PDV en PostgreSQL.",
        hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/011_id_plantas_id_pdv.sql",
      });
    }
    return res.status(500).json({ ok: false, error: "Error listando PDV" });
  }
}

export async function getPdvEstacionConsola(req: Request, res: Response) {
  try {
    const plantaIdRaw = req.query.planta_id;
    const plantaId =
      typeof plantaIdRaw === "string"
        ? plantaIdRaw.trim()
        : plantaIdRaw != null
          ? String(plantaIdRaw).trim()
          : "";
    if (!plantaId || !/^\d+$/.test(plantaId)) {
      return res.status(400).json({
        ok: false,
        error: "query planta_id requerido (id numérico de la planta)",
      });
    }

    const estaciones = await listEstacionesPorPlanta(plantaId);
    return res.json({ ok: true, estaciones });
  } catch (error) {
    console.error("[consola] getPdvEstacion:", error);
    const pg = error as { code?: string };
    if (pg.code === "42P01") {
      return res.status(500).json({
        ok: false,
        error: "No existe la tabla ID-PDV-ESTACION en PostgreSQL.",
        hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/012_id_pdv_estacion.sql",
      });
    }
    return res.status(500).json({ ok: false, error: "Error listando estaciones" });
  }
}

export async function getTelemetriaConsola(req: Request, res: Response) {
  try {
    const clave = req.params.clave;
    if (!clave || typeof clave !== "string") {
      return res.status(400).json({ ok: false, error: "clave inválida" });
    }

    const data = await getTelemetriaPorClave(clave);
    if (!data) {
      return res.status(404).json({ ok: false, error: "unidad no encontrada" });
    }

    return res.json({
      ok: true,
      telemetria: data.telemetria,
      raspberry: data.raspberry,
    });
  } catch (error) {
    console.error("[consola] getTelemetria:", error);
    return res.status(500).json({ ok: false, error: "Error leyendo telemetría" });
  }
}

export async function getEventosConsola(req: Request, res: Response) {
  try {
    const clave = req.query.unidad_clave;
    if (!clave || typeof clave !== "string") {
      return res.status(400).json({
        ok: false,
        error: "query unidad_clave requerido",
      });
    }

    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 50);

    const eventos = await listEventosPorClave(
      clave,
      Number.isFinite(limit) ? limit : 50
    );
    return res.json({ ok: true, eventos });
  } catch (error) {
    console.error("[consola] getEventos:", error);
    return res.status(500).json({ ok: false, error: "Error listando eventos" });
  }
}

export async function postInicioRuta(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      lat,
      lon,
      nivel,
      nivel_carburacion,
      nivel_almacen,
      velocidad_kmh,
      satelites,
      gps_fix,
    } = req.body ?? {};

    if (!unidad_id || typeof unidad_id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "unidad_id (clave) es requerido",
      });
    }

    const unidad = await getUnidadByClave(unidad_id);
    if (!unidad) {
      return res.status(400).json({
        ok: false,
        error: "unidad_id no existe",
      });
    }

    const latNum = toFiniteNumber(lat);
    const lonNum = toFiniteNumber(lon);
    const nivelNum = toFiniteNumber(nivel);
    const nivelCarb = toFiniteNumber(nivel_carburacion);
    const nivelAlm = toFiniteNumber(nivel_almacen);
    const vel = toFiniteNumber(velocidad_kmh);

    if (latNum === null || lonNum === null) {
      return res.status(400).json({
        ok: false,
        error: "lat y lon deben ser números (use 0 si no hay fix)",
      });
    }

    if (nivelNum === null) {
      return res.status(400).json({
        ok: false,
        error: "nivel es requerido (número)",
      });
    }

    if (nivelNum < 0 || nivelNum > 100) {
      return res.status(400).json({
        ok: false,
        error: "nivel debe estar entre 0 y 100",
      });
    }

    if (nivelCarb !== null && (nivelCarb < 0 || nivelCarb > 100)) {
      return res.status(400).json({
        ok: false,
        error: "nivel_carburacion debe estar entre 0 y 100",
      });
    }

    if (nivelAlm !== null && (nivelAlm < 0 || nivelAlm > 100)) {
      return res.status(400).json({
        ok: false,
        error: "nivel_almacen debe estar entre 0 y 100",
      });
    }

    if (vel !== null && (vel < 0 || vel > 300)) {
      return res.status(400).json({
        ok: false,
        error: "velocidad_kmh debe estar entre 0 y 300",
      });
    }

    const sats = satelites === undefined ? 0 : toIntOrNull(satelites) ?? 0;
    const fix =
      gps_fix === undefined || gps_fix === null
        ? false
        : Boolean(gps_fix);

    const evento = await insertEventoInicioRuta({
      unidad_db_id: unidad.id,
      unidad_clave: unidad.clave,
      lat: latNum,
      lon: lonNum,
      nivel: nivelNum,
      nivel_carburacion: nivelCarb,
      nivel_almacen: nivelAlm,
      velocidad_kmh: vel,
      satelites: sats,
      gps_fix: fix,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Inicio de ruta",
      evento,
    });
  } catch (error) {
    console.error("[consola] postInicioRuta:", error);
    const pg = error as { code?: string; message?: string; detail?: string };
    if (pg.code === "42P01") {
      return res.status(500).json({
        ok: false,
        error: "No existe la tabla de inicios de ruta en PostgreSQL.",
        hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/007_eventos_inicio_ruta.sql",
      });
    }
    if (pg.code === "42501") {
      return res.status(500).json({
        ok: false,
        error: "Sin permiso para escribir en la base de datos (inicio de ruta).",
        hint: "Revisa el usuario de DATABASE_URL y el esquema gasuber.",
      });
    }
    return res.status(500).json({
      ok: false,
      error: "Error guardando evento",
      ...(process.env.NODE_ENV !== "production" && pg.message
        ? { detail: pg.message }
        : {}),
    });
  }
}

export async function getPedidosConsola(req: Request, res: Response) {
  try {
    const unidadClaveRaw = req.query.unidad_clave;
    if (!unidadClaveRaw || typeof unidadClaveRaw !== "string") {
      return res.status(400).json({
        ok: false,
        error: "query unidad_clave requerido",
      });
    }

    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 100);

    const unidad = await getUnidadByClave(unidadClaveRaw);
    if (!unidad) {
      return res.status(404).json({ ok: false, error: "unidad no encontrada" });
    }

    const pedidos = await listPedidosParaConsolaUnidad(
      unidad.id,
      Number.isFinite(limit) ? limit : 100
    );
    return res.json({ ok: true, pedidos });
  } catch (error) {
    console.error("[consola] getPedidos:", error);
    return res.status(500).json({ ok: false, error: "Error listando pedidos" });
  }
}

export async function postPedidoConsola(req: Request, res: Response) {
  try {
    const {
      unidad_clave,
      cliente_nombre,
      telefono_origen,
      colonia,
      calle,
      cp,
      numero_exterior,
      numero_interior,
      tipo_origen,
      nombre_empresa,
      litros_solicitados,
    } = req.body ?? {};

    if (!unidad_clave || typeof unidad_clave !== "string") {
      return res.status(400).json({ ok: false, error: "unidad_clave requerido" });
    }

    const clienteNombre = toTrimmedString(cliente_nombre);
    const telefono = toTrimmedString(telefono_origen);
    const coloniaTxt = toTrimmedString(colonia);
    const calleTxt = toTrimmedString(calle);
    const numeroExteriorTxt = toTrimmedString(numero_exterior);
    const numeroInteriorTxt = toTrimmedString(numero_interior);
    const tipo = normalizeTipoOrigen(tipo_origen);
    const nombreEmpresaRaw = toTrimmedString(nombre_empresa);

    const cpNorm = normalizeCpToInt(cp);
    const litros = parseLitrosEnteroPositivo(litros_solicitados);

    const unidad = await getUnidadByClave(unidad_clave);
    if (!unidad) {
      return res.status(400).json({ ok: false, error: "unidad_clave no existe" });
    }

    if (
      !clienteNombre ||
      !telefono ||
      !coloniaTxt ||
      !calleTxt ||
      !numeroExteriorTxt ||
      !numeroInteriorTxt ||
      !tipo ||
      !nombreEmpresaRaw ||
      cpNorm == null ||
      litros == null
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Completa todos los campos requeridos (usa N/A donde no aplique y CP como solo dígitos).",
      });
    }

    const numeroInteriorNorm = normalizeNA(numeroInteriorTxt);
    const nombreEmpresaNorm = normalizeNA(nombreEmpresaRaw);

    if (tipo === "casa" && nombreEmpresaNorm !== "N/A") {
      return res.status(400).json({
        ok: false,
        error: "Si es Casa, el nombre de empresa debe ser N/A.",
      });
    }
    if (tipo === "empresa" && nombreEmpresaNorm === "N/A") {
      return res.status(400).json({
        ok: false,
        error: "Si es Empresa, el nombre de empresa no puede ser N/A.",
      });
    }

    const tipoLabel = tipo === "casa" ? "Casa" : "Empresa";
    const direccion_texto = `${tipoLabel} - ${nombreEmpresaNorm} | ${calleTxt} No. ${numeroExteriorTxt} Int. ${numeroInteriorNorm}, ${coloniaTxt}, CP ${cpNorm}`;
    const prioridad = prioridadDesdeLitros(litros);

    const pedido = await insertPedido({
      unidad_db_id: unidad.id,
      telefono_origen: telefono,
      cliente_nombre: clienteNombre,
      direccion_texto,
      litros_solicitados: litros,
      prioridad,
      colonia: coloniaTxt,
      calle: calleTxt,
      cp: cpNorm,
      numero_exterior: numeroExteriorTxt,
      numero_interior: numeroInteriorNorm,
      tipo_origen: tipo,
      nombre_empresa: nombreEmpresaNorm,
    });

    return res.status(201).json({ ok: true, pedido });
  } catch (error) {
    console.error("[consola] postPedidoConsola:", error);
    return res.status(500).json({ ok: false, error: "Error guardando pedido" });
  }
}

export async function postPedidoAvanzarConsola(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pedidoId = Number(id);
    if (!Number.isFinite(pedidoId)) {
      return res.status(400).json({ ok: false, error: "pedido id inválido" });
    }

    const {
      unidad_clave,
      nivel_carburacion,
      nivel_almacen,
    }: {
      unidad_clave?: unknown;
      nivel_carburacion?: unknown;
      nivel_almacen?: unknown;
    } = req.body ?? {};

    if (!unidad_clave || typeof unidad_clave !== "string") {
      return res.status(400).json({ ok: false, error: "unidad_clave requerido" });
    }

    const unidad = await getUnidadByClave(unidad_clave);
    if (!unidad) {
      return res.status(400).json({ ok: false, error: "unidad_clave no existe" });
    }

    const nivelCarb = toFiniteNumber(nivel_carburacion);
    const nivelAlm = toFiniteNumber(nivel_almacen);

    const result = await avanzarPedidoEstado({
      pedido_id: String(pedidoId),
      unidad_db_id: unidad.id,
      nivel_carburacion: nivelCarb,
      nivel_almacen: nivelAlm,
    });

    // Avisos por WhatsApp al cambiar estado (no bloqueantes).
    if (result.estado_nuevo === "validando" || result.estado_nuevo === "convertido_servicio") {
      const telefono = result.telefono_origen;
      const text =
        result.estado_nuevo === "validando"
          ? `Tu pedido Folio #${result.pedido_id} inició. En breve te atendemos.`
          : `Tu pedido Folio #${result.pedido_id} quedó terminado. Gracias por tu preferencia.`;
      try {
        await sendWhatsAppTextMessage(telefono, text);
        console.log(
          `[whatsapp] Aviso estado pedido enviado ok pedidoId=${result.pedido_id} estado=${result.estado_nuevo} to=${telefono}`
        );
      } catch (e) {
        if (axios.isAxiosError(e)) {
          console.error(
            `[whatsapp] Error aviso estado pedido status=${e.response?.status} estado=${result.estado_nuevo} message="${e.message}"`,
            e.response?.data ?? ""
          );
        } else {
          console.error("[whatsapp] Error aviso estado pedido:", e);
        }
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("[consola] postPedidoAvanzarConsola:", error);
    const e = error as { status?: number; message?: string; };
    return res.status(e.status && Number.isFinite(e.status) ? e.status : 500).json({
      ok: false,
      error: e.message || "Error cambiando estado del pedido",
    });
  }
}

export async function postPedidoCancelarConsola(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pedidoId = Number(id);
    if (!Number.isFinite(pedidoId)) {
      return res.status(400).json({ ok: false, error: "pedido id inválido" });
    }

    const {
      unidad_clave,
      razon_cancelacion,
      nivel_carburacion,
      nivel_almacen,
    }: {
      unidad_clave?: unknown;
      razon_cancelacion?: unknown;
      nivel_carburacion?: unknown;
      nivel_almacen?: unknown;
    } = req.body ?? {};

    if (!unidad_clave || typeof unidad_clave !== "string") {
      return res.status(400).json({ ok: false, error: "unidad_clave requerido" });
    }

    const unidad = await getUnidadByClave(unidad_clave);
    if (!unidad) {
      return res.status(400).json({ ok: false, error: "unidad_clave no existe" });
    }

    const razon = toTrimmedString(razon_cancelacion);
    if (!razon) {
      return res.status(400).json({ ok: false, error: "razón de cancelación requerida" });
    }
    if (razon.length > 250) {
      return res.status(400).json({ ok: false, error: "razón excede 250 caracteres" });
    }

    const nivelCarb = toFiniteNumber(nivel_carburacion);
    const nivelAlm = toFiniteNumber(nivel_almacen);

    await cancelarPedido({
      pedido_id: String(pedidoId),
      unidad_db_id: unidad.id,
      razon_cancelacion: razon,
      nivel_carburacion: nivelCarb,
      nivel_almacen: nivelAlm,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[consola] postPedidoCancelarConsola:", error);
    const e = error as { status?: number; message?: string; };
    return res.status(e.status && Number.isFinite(e.status) ? e.status : 500).json({
      ok: false,
      error: e.message || "Error cancelando el pedido",
    });
  }
}
