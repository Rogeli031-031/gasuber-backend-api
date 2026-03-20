"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnidadesConsola = getUnidadesConsola;
exports.getTelemetriaConsola = getTelemetriaConsola;
exports.getEventosConsola = getEventosConsola;
exports.postInicioRuta = postInicioRuta;
exports.getPedidosConsola = getPedidosConsola;
exports.postPedidoConsola = postPedidoConsola;
const unidades_service_1 = require("../services/unidades.service");
const telemetria_service_1 = require("../services/telemetria.service");
const eventosInicioRuta_service_1 = require("../services/eventosInicioRuta.service");
const pedidos_service_1 = require("../services/pedidos.service");
function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
function toIntOrNull(value) {
    const n = toFiniteNumber(value);
    if (n === null)
        return null;
    return Math.round(n);
}
function toTrimmedString(value) {
    if (typeof value !== "string")
        return null;
    const s = value.trim();
    return s ? s : null;
}
function normalizeNA(value) {
    return value.trim().toUpperCase() === "N/A" ? "N/A" : value.trim();
}
function normalizeTipoOrigen(value) {
    const s = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (s === "casa")
        return "casa";
    if (s === "empresa")
        return "empresa";
    return null;
}
function normalizeCpToInt(cpRaw) {
    const s = typeof cpRaw === "number" && Number.isFinite(cpRaw)
        ? String(Math.trunc(cpRaw))
        : typeof cpRaw === "string"
            ? cpRaw.trim()
            : "";
    if (!s)
        return null;
    // Acepta:
    // - "647489"
    // - "CP647489"
    // - "CP 647489" (exactamente un espacio)
    const digitsOnly = s.match(/^\d+$/);
    const cpWithPrefix = s.match(/^CP ?(\d+)$/i);
    const digits = digitsOnly ? digitsOnly[0] : cpWithPrefix ? cpWithPrefix[1] : null;
    if (!digits)
        return null;
    const n = Number(digits);
    if (!Number.isFinite(n) || !Number.isInteger(n))
        return null;
    return n;
}
function parseLitrosEnteroPositivo(litrosRaw) {
    const n = typeof litrosRaw === "number"
        ? litrosRaw
        : typeof litrosRaw === "string"
            ? Number(litrosRaw.trim())
            : NaN;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
        return null;
    return n;
}
function prioridadDesdeLitros(litros) {
    if (litros >= 1001)
        return 5; // Alta
    if (litros >= 201)
        return 3; // Media
    return 1; // Baja (1..200)
}
async function getUnidadesConsola(_req, res) {
    try {
        const unidades = await (0, unidades_service_1.listUnidadesParaConsola)();
        return res.json({ ok: true, unidades });
    }
    catch (error) {
        console.error("[consola] getUnidades:", error);
        return res.status(500).json({ ok: false, error: "Error listando unidades" });
    }
}
async function getTelemetriaConsola(req, res) {
    try {
        const clave = req.params.clave;
        if (!clave || typeof clave !== "string") {
            return res.status(400).json({ ok: false, error: "clave inválida" });
        }
        const data = await (0, telemetria_service_1.getTelemetriaPorClave)(clave);
        if (!data) {
            return res.status(404).json({ ok: false, error: "unidad no encontrada" });
        }
        return res.json({
            ok: true,
            telemetria: data.telemetria,
            raspberry: data.raspberry,
        });
    }
    catch (error) {
        console.error("[consola] getTelemetria:", error);
        return res.status(500).json({ ok: false, error: "Error leyendo telemetría" });
    }
}
async function getEventosConsola(req, res) {
    try {
        const clave = req.query.unidad_clave;
        if (!clave || typeof clave !== "string") {
            return res.status(400).json({
                ok: false,
                error: "query unidad_clave requerido",
            });
        }
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 50);
        const eventos = await (0, eventosInicioRuta_service_1.listEventosPorClave)(clave, Number.isFinite(limit) ? limit : 50);
        return res.json({ ok: true, eventos });
    }
    catch (error) {
        console.error("[consola] getEventos:", error);
        return res.status(500).json({ ok: false, error: "Error listando eventos" });
    }
}
async function postInicioRuta(req, res) {
    try {
        const { unidad_id, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, satelites, gps_fix, } = req.body ?? {};
        if (!unidad_id || typeof unidad_id !== "string") {
            return res.status(400).json({
                ok: false,
                error: "unidad_id (clave) es requerido",
            });
        }
        const unidad = await (0, unidades_service_1.getUnidadByClave)(unidad_id);
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
        const fix = gps_fix === undefined || gps_fix === null
            ? false
            : Boolean(gps_fix);
        const evento = await (0, eventosInicioRuta_service_1.insertEventoInicioRuta)({
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
    }
    catch (error) {
        console.error("[consola] postInicioRuta:", error);
        const pg = error;
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
async function getPedidosConsola(req, res) {
    try {
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 100);
        const pedidos = await (0, pedidos_service_1.listPedidosParaConsola)(Number.isFinite(limit) ? limit : 100);
        return res.json({ ok: true, pedidos });
    }
    catch (error) {
        console.error("[consola] getPedidos:", error);
        return res.status(500).json({ ok: false, error: "Error listando pedidos" });
    }
}
async function postPedidoConsola(req, res) {
    try {
        const { cliente_nombre, telefono_origen, colonia, calle, cp, numero_exterior, numero_interior, tipo_origen, nombre_empresa, litros_solicitados, } = req.body ?? {};
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
        if (!clienteNombre ||
            !telefono ||
            !coloniaTxt ||
            !calleTxt ||
            !numeroExteriorTxt ||
            !numeroInteriorTxt ||
            !tipo ||
            !nombreEmpresaRaw ||
            cpNorm == null ||
            litros == null) {
            return res.status(400).json({
                ok: false,
                error: "Completa todos los campos requeridos (usa N/A donde no aplique y CP como solo dígitos).",
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
        const pedido = await (0, pedidos_service_1.insertPedido)({
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
    }
    catch (error) {
        console.error("[consola] postPedidoConsola:", error);
        return res.status(500).json({ ok: false, error: "Error guardando pedido" });
    }
}
