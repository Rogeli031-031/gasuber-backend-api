"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnidadesConsola = getUnidadesConsola;
exports.getPlantasConsola = getPlantasConsola;
exports.getPdvConsola = getPdvConsola;
exports.getPdvEstacionConsola = getPdvEstacionConsola;
exports.getPdvAlmacenConsola = getPdvAlmacenConsola;
exports.getPdvAutotanqueConsola = getPdvAutotanqueConsola;
exports.getActivosTarjetasConsola = getActivosTarjetasConsola;
exports.getTarjetasConsola = getTarjetasConsola;
exports.patchActivoTarjetaConsola = patchActivoTarjetaConsola;
exports.getTripulacionPuestosConsola = getTripulacionPuestosConsola;
exports.getTripulacionEmpleadosConsola = getTripulacionEmpleadosConsola;
exports.getTripulacionAsignacionConsola = getTripulacionAsignacionConsola;
exports.postTripulacionAsignacionConsola = postTripulacionAsignacionConsola;
exports.getTelemetriaAutotanqueConsola = getTelemetriaAutotanqueConsola;
exports.getEventosConsola = getEventosConsola;
exports.postInicioRuta = postInicioRuta;
exports.getPedidosConsola = getPedidosConsola;
exports.postPedidoConsola = postPedidoConsola;
exports.postPedidoAvanzarConsola = postPedidoAvanzarConsola;
exports.postPedidoCancelarConsola = postPedidoCancelarConsola;
const axios_1 = __importDefault(require("axios"));
const unidades_service_1 = require("../services/unidades.service");
const telemetria_service_1 = require("../services/telemetria.service");
const eventosInicioRuta_service_1 = require("../services/eventosInicioRuta.service");
const pedidos_service_1 = require("../services/pedidos.service");
const whatsapp_service_1 = require("../services/whatsapp.service");
const plantasPdv_service_1 = require("../services/plantasPdv.service");
const tripulacion_service_1 = require("../services/tripulacion.service");
const tarjetas_service_1 = require("../services/tarjetas.service");
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
async function getPlantasConsola(_req, res) {
    try {
        const plantas = await (0, plantasPdv_service_1.listPlantas)();
        return res.json({ ok: true, plantas });
    }
    catch (error) {
        console.error("[consola] getPlantas:", error);
        const pg = error;
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
async function getPdvConsola(req, res) {
    try {
        const plantaIdRaw = req.query.planta_id;
        const plantaId = typeof plantaIdRaw === "string"
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
        const pdvs = await (0, plantasPdv_service_1.listPdvPorPlanta)(plantaId);
        return res.json({ ok: true, pdvs });
    }
    catch (error) {
        console.error("[consola] getPdv:", error);
        const pg = error;
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
async function getPdvEstacionConsola(req, res) {
    try {
        const plantaIdRaw = req.query.planta_id;
        const plantaId = typeof plantaIdRaw === "string"
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
        const estaciones = await (0, plantasPdv_service_1.listEstacionesPorPlanta)(plantaId);
        return res.json({ ok: true, estaciones });
    }
    catch (error) {
        console.error("[consola] getPdvEstacion:", error);
        const pg = error;
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
async function getPdvAlmacenConsola(req, res) {
    try {
        const plantaIdRaw = req.query.planta_id;
        const plantaId = typeof plantaIdRaw === "string"
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
        const almacenes = await (0, plantasPdv_service_1.listAlmacenesPorPlanta)(plantaId);
        return res.json({ ok: true, almacenes });
    }
    catch (error) {
        console.error("[consola] getPdvAlmacen:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existe la tabla ID-PDV-ALMACEN en PostgreSQL.",
                hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/014_id_pdv_almacen.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error listando almacenes" });
    }
}
async function getPdvAutotanqueConsola(req, res) {
    try {
        const plantaIdRaw = req.query.planta_id;
        const plantaId = typeof plantaIdRaw === "string"
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
        const autotanques = await (0, plantasPdv_service_1.listAutotanquesPorPlanta)(plantaId);
        return res.json({ ok: true, autotanques });
    }
    catch (error) {
        console.error("[consola] getPdvAutotanque:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existe la tabla ID-PDV-AUTOTANQUE en PostgreSQL.",
                hint: "En el servidor (con DATABASE_URL): node scripts/migrate.cjs --file=sql/016_id_pdv_autotanque.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error listando autotanques" });
    }
}
async function getActivosTarjetasConsola(_req, res) {
    try {
        const activos = await (0, plantasPdv_service_1.listActivosConTarjeta)();
        return res.json({ ok: true, activos });
    }
    catch (error) {
        console.error("[consola] getActivosTarjetas:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "Falta alguna tabla de PDV/tarjetas en PostgreSQL (ID-PDV-ESTACION / ID-PDV-ALMACEN / ID-PDV-AUTOTANQUE / ID-TARJETA / ID-PLANTAS).",
                hint: "Corre: node scripts/migrate.cjs --file=sql/020_id_tarjeta_rpi.sql",
                pg_detail: pg.message,
            });
        }
        if (pg.code === "42703") {
            return res.status(500).json({
                ok: false,
                error: "Falta la columna 'tarjeta_id' en alguna tabla de PDV (ID-PDV-ESTACION / ID-PDV-ALMACEN / ID-PDV-AUTOTANQUE). La migración 020 no se corrió completa.",
                hint: "Corre: node scripts/migrate.cjs --file=sql/020_id_tarjeta_rpi.sql",
                pg_detail: pg.message,
            });
        }
        return res.status(500).json({
            ok: false,
            error: "Error listando activos con tarjeta",
            pg_code: pg.code,
            pg_message: pg.message,
            pg_detail: pg.detail,
            pg_hint: pg.hint,
            pg_table: pg.table,
            pg_column: pg.column,
        });
    }
}
async function getTarjetasConsola(_req, res) {
    try {
        const tarjetas = await (0, tarjetas_service_1.listTarjetasRpi)();
        return res.json({ ok: true, tarjetas });
    }
    catch (error) {
        console.error("[consola] getTarjetas:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existe la tabla ID-TARJETA en PostgreSQL.",
                hint: "node scripts/migrate.cjs --file=sql/020_id_tarjeta_rpi.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error listando tarjetas" });
    }
}
async function patchActivoTarjetaConsola(req, res) {
    try {
        const tipoRaw = req.body?.tipo;
        const activoRaw = req.body?.activo_id;
        const tarjetaRaw = req.body?.tarjeta_id;
        const tipos = ["estacion", "almacen", "autotanque"];
        const tipo = typeof tipoRaw === "string" && tipos.includes(tipoRaw)
            ? tipoRaw
            : null;
        if (!tipo) {
            return res.status(400).json({
                ok: false,
                error: "tipo debe ser estacion, almacen o autotanque",
            });
        }
        const activo_id = typeof activoRaw === "string"
            ? activoRaw.trim()
            : activoRaw != null
                ? String(activoRaw).trim()
                : "";
        if (!activo_id || !/^\d+$/.test(activo_id)) {
            return res.status(400).json({
                ok: false,
                error: "activo_id requerido (id numérico del registro en BD)",
            });
        }
        let tarjeta_id = null;
        if (tarjetaRaw === null || tarjetaRaw === undefined || tarjetaRaw === "") {
            tarjeta_id = null;
        }
        else if (typeof tarjetaRaw === "number" && Number.isFinite(tarjetaRaw)) {
            tarjeta_id = String(Math.round(tarjetaRaw));
        }
        else if (typeof tarjetaRaw === "string" && /^\d+$/.test(tarjetaRaw.trim())) {
            tarjeta_id = tarjetaRaw.trim();
        }
        else {
            return res.status(400).json({
                ok: false,
                error: "tarjeta_id inválido (use vacío o null para quitar la asignación)",
            });
        }
        await (0, tarjetas_service_1.setTarjetaActivo)({ tipo, activoId: activo_id, tarjetaId: tarjeta_id });
        return res.json({ ok: true });
    }
    catch (error) {
        const e = error;
        if (e.code === "23505") {
            return res.status(409).json({
                ok: false,
                error: "Esa tarjeta ya está asignada a otro registro del mismo tipo (autotanque, estación o almacén).",
            });
        }
        if (e.code === "NOT_FOUND") {
            return res.status(404).json({ ok: false, error: "Activo no encontrado" });
        }
        if (e.code === "VALIDATION") {
            return res.status(400).json({ ok: false, error: e.message || "Datos inválidos" });
        }
        console.error("[consola] patchActivoTarjeta:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "Faltan tablas de tarjetas o columnas tarjeta_id.",
                hint: "node scripts/migrate.cjs --file=sql/020_id_tarjeta_rpi.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error guardando tarjeta" });
    }
}
async function getTripulacionPuestosConsola(_req, res) {
    try {
        const puestos = await (0, tripulacion_service_1.listPuestosTripulacion)();
        return res.json({ ok: true, puestos });
    }
    catch (error) {
        console.error("[consola] getTripulacionPuestos:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existen tablas de tripulación en PostgreSQL.",
                hint: "node scripts/migrate.cjs --file=sql/018_tripulacion_autotanque.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error listando puestos" });
    }
}
async function getTripulacionEmpleadosConsola(req, res) {
    try {
        const plantaIdRaw = req.query.planta_id;
        const puestoRaw = req.query.puesto;
        const autotanqueIdRaw = req.query.autotanque_id;
        const plantaId = typeof plantaIdRaw === "string" ? plantaIdRaw.trim() : String(plantaIdRaw ?? "").trim();
        const puesto = typeof puestoRaw === "string" ? puestoRaw.trim().toUpperCase() : "";
        const autotanqueId = typeof autotanqueIdRaw === "string"
            ? autotanqueIdRaw.trim()
            : autotanqueIdRaw != null
                ? String(autotanqueIdRaw).trim()
                : "";
        if (!plantaId || !/^\d+$/.test(plantaId)) {
            return res.status(400).json({
                ok: false,
                error: "query planta_id requerido",
            });
        }
        if (puesto !== "CHOFER" && puesto !== "AYUDANTE") {
            return res.status(400).json({
                ok: false,
                error: "query puesto debe ser CHOFER o AYUDANTE",
            });
        }
        if (!autotanqueId || !/^\d+$/.test(autotanqueId)) {
            return res.status(400).json({
                ok: false,
                error: "query autotanque_id requerido",
            });
        }
        const empleados = await (0, tripulacion_service_1.listEmpleadosTripulacionDisponibles)({
            plantaId,
            puestoCodigo: puesto,
            autotanqueIdExcluirActual: autotanqueId,
        });
        return res.json({ ok: true, empleados });
    }
    catch (error) {
        console.error("[consola] getTripulacionEmpleados:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existen tablas de tripulación en PostgreSQL.",
                hint: "node scripts/migrate.cjs --file=sql/018_tripulacion_autotanque.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error listando empleados" });
    }
}
async function getTripulacionAsignacionConsola(req, res) {
    try {
        const atqRaw = req.query.autotanque_id;
        const autotanqueId = typeof atqRaw === "string" ? atqRaw.trim() : String(atqRaw ?? "").trim();
        if (!autotanqueId || !/^\d+$/.test(autotanqueId)) {
            return res.status(400).json({
                ok: false,
                error: "query autotanque_id requerido",
            });
        }
        const asignacion = await (0, tripulacion_service_1.getAsignacionPorAutotanque)(autotanqueId);
        return res.json({ ok: true, asignacion });
    }
    catch (error) {
        console.error("[consola] getTripulacionAsignacion:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existen tablas de tripulación en PostgreSQL.",
                hint: "node scripts/migrate.cjs --file=sql/018_tripulacion_autotanque.sql",
            });
        }
        return res.status(500).json({ ok: false, error: "Error leyendo asignación" });
    }
}
async function postTripulacionAsignacionConsola(req, res) {
    try {
        const { autotanque_id, chofer_empleado_id, ayudante_empleado_id } = req.body ?? {};
        const atq = typeof autotanque_id === "string"
            ? autotanque_id.trim()
            : autotanque_id != null
                ? String(autotanque_id).trim()
                : "";
        const ch = typeof chofer_empleado_id === "string"
            ? chofer_empleado_id.trim()
            : chofer_empleado_id != null
                ? String(chofer_empleado_id).trim()
                : "";
        const ay = typeof ayudante_empleado_id === "string"
            ? ayudante_empleado_id.trim()
            : ayudante_empleado_id != null
                ? String(ayudante_empleado_id).trim()
                : "";
        if (!atq || !/^\d+$/.test(atq)) {
            return res.status(400).json({ ok: false, error: "autotanque_id inválido" });
        }
        if (!ch || !/^\d+$/.test(ch)) {
            return res.status(400).json({ ok: false, error: "chofer_empleado_id requerido" });
        }
        if (!ay || !/^\d+$/.test(ay)) {
            return res.status(400).json({ ok: false, error: "ayudante_empleado_id requerido" });
        }
        const result = await (0, tripulacion_service_1.guardarAsignacionTripulacion)({
            autotanqueId: atq,
            choferEmpleadoId: ch,
            ayudanteEmpleadoId: ay,
        });
        return res.status(201).json({ ok: true, ...result });
    }
    catch (error) {
        console.error("[consola] postTripulacionAsignacion:", error);
        const pg = error;
        if (pg.code === "42P01") {
            return res.status(500).json({
                ok: false,
                error: "No existen tablas de tripulación en PostgreSQL.",
                hint: "node scripts/migrate.cjs --file=sql/018_tripulacion_autotanque.sql",
            });
        }
        if (pg.code === "23505") {
            return res.status(409).json({
                ok: false,
                error: "Conflicto de asignación (empleado u autotanque duplicado).",
            });
        }
        const e = error;
        if (e.status && e.message) {
            return res.status(e.status).json({ ok: false, error: e.message });
        }
        return res.status(500).json({ ok: false, error: "Error guardando asignación" });
    }
}
async function getTelemetriaAutotanqueConsola(req, res) {
    try {
        const idRaw = req.params.autotanqueId;
        const id = typeof idRaw === "string"
            ? idRaw.trim()
            : idRaw != null
                ? String(idRaw).trim()
                : "";
        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({
                ok: false,
                error: "autotanque_id inválido en la ruta",
            });
        }
        const data = await (0, telemetria_service_1.getTelemetriaPorAutotanqueId)(id);
        if (!data) {
            return res.status(404).json({ ok: false, error: "autotanque no encontrado" });
        }
        return res.json({
            ok: true,
            sin_tarjeta_asignada: data.sin_tarjeta_asignada,
            autotanque: data.autotanque,
            telemetria: data.telemetria,
            raspberry: data.raspberry,
        });
    }
    catch (error) {
        console.error("[consola] getTelemetriaAutotanque:", error);
        return res.status(500).json({ ok: false, error: "Error leyendo telemetría" });
    }
}
async function getEventosConsola(req, res) {
    try {
        const atqRaw = req.query.autotanque_id;
        const autotanqueId = typeof atqRaw === "string"
            ? atqRaw.trim()
            : atqRaw != null
                ? String(atqRaw).trim()
                : "";
        if (!autotanqueId || !/^\d+$/.test(autotanqueId)) {
            return res.status(400).json({
                ok: false,
                error: "query autotanque_id requerido (id de ID-PDV-AUTOTANQUE)",
            });
        }
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 50);
        const eventos = await (0, eventosInicioRuta_service_1.listEventosPorAutotanque)(autotanqueId, Number.isFinite(limit) ? limit : 50);
        return res.json({ ok: true, eventos });
    }
    catch (error) {
        console.error("[consola] getEventos:", error);
        return res.status(500).json({ ok: false, error: "Error listando eventos" });
    }
}
async function postInicioRuta(req, res) {
    try {
        const { autotanque_id: atqBody, lat, lon, nivel, nivel_carburacion, nivel_almacen, velocidad_kmh, satelites, gps_fix, } = req.body ?? {};
        const autotanque_id = typeof atqBody === "string"
            ? atqBody.trim()
            : atqBody != null
                ? String(atqBody).trim()
                : "";
        if (!autotanque_id || !/^\d+$/.test(autotanque_id)) {
            return res.status(400).json({
                ok: false,
                error: "autotanque_id es requerido (id de ID-PDV-AUTOTANQUE, el mismo que en la consola)",
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
        const evento = await (0, eventosInicioRuta_service_1.insertEventoInicioRutaAutotanque)({
            autotanque_id,
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
        const atqRaw = req.query.autotanque_id;
        const autotanqueId = typeof atqRaw === "string"
            ? atqRaw.trim()
            : atqRaw != null
                ? String(atqRaw).trim()
                : "";
        if (!autotanqueId || !/^\d+$/.test(autotanqueId)) {
            return res.status(400).json({
                ok: false,
                error: "query autotanque_id requerido (id de ID-PDV-AUTOTANQUE)",
            });
        }
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : Number(limitRaw ?? 100);
        const pedidos = await (0, pedidos_service_1.listPedidosParaConsolaAutotanque)(autotanqueId, Number.isFinite(limit) ? limit : 100);
        return res.json({ ok: true, pedidos });
    }
    catch (error) {
        console.error("[consola] getPedidos:", error);
        return res.status(500).json({ ok: false, error: "Error listando pedidos" });
    }
}
async function postPedidoConsola(req, res) {
    try {
        const { autotanque_id: atqIn, cliente_nombre, telefono_origen, colonia, calle, cp, numero_exterior, numero_interior, tipo_origen, nombre_empresa, litros_solicitados, } = req.body ?? {};
        const autotanque_id = typeof atqIn === "string"
            ? atqIn.trim()
            : atqIn != null
                ? String(atqIn).trim()
                : "";
        if (!autotanque_id || !/^\d+$/.test(autotanque_id)) {
            return res.status(400).json({
                ok: false,
                error: "autotanque_id requerido (id de ID-PDV-AUTOTANQUE)",
            });
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
        const pedido = await (0, pedidos_service_1.insertPedidoAutotanque)({
            autotanque_id,
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
async function postPedidoAvanzarConsola(req, res) {
    try {
        const { id } = req.params;
        const pedidoId = Number(id);
        if (!Number.isFinite(pedidoId)) {
            return res.status(400).json({ ok: false, error: "pedido id inválido" });
        }
        const { autotanque_id: atqAv, nivel_carburacion, nivel_almacen, } = req.body ?? {};
        const autotanque_id = typeof atqAv === "string"
            ? atqAv.trim()
            : atqAv != null
                ? String(atqAv).trim()
                : "";
        if (!autotanque_id || !/^\d+$/.test(autotanque_id)) {
            return res.status(400).json({ ok: false, error: "autotanque_id requerido" });
        }
        const nivelCarb = toFiniteNumber(nivel_carburacion);
        const nivelAlm = toFiniteNumber(nivel_almacen);
        const result = await (0, pedidos_service_1.avanzarPedidoEstadoAutotanque)({
            pedido_id: String(pedidoId),
            autotanque_id,
            nivel_carburacion: nivelCarb,
            nivel_almacen: nivelAlm,
        });
        // Avisos por WhatsApp al cambiar estado (no bloqueantes).
        if (result.estado_nuevo === "validando" || result.estado_nuevo === "convertido_servicio") {
            const telefono = result.telefono_origen;
            const text = result.estado_nuevo === "validando"
                ? `Tu pedido Folio #${result.pedido_id} inició. En breve te atendemos.`
                : `Tu pedido Folio #${result.pedido_id} quedó terminado. Gracias por tu preferencia.`;
            try {
                await (0, whatsapp_service_1.sendWhatsAppTextMessage)(telefono, text);
                console.log(`[whatsapp] Aviso estado pedido enviado ok pedidoId=${result.pedido_id} estado=${result.estado_nuevo} to=${telefono}`);
            }
            catch (e) {
                if (axios_1.default.isAxiosError(e)) {
                    console.error(`[whatsapp] Error aviso estado pedido status=${e.response?.status} estado=${result.estado_nuevo} message="${e.message}"`, e.response?.data ?? "");
                }
                else {
                    console.error("[whatsapp] Error aviso estado pedido:", e);
                }
            }
        }
        return res.json({ ok: true });
    }
    catch (error) {
        console.error("[consola] postPedidoAvanzarConsola:", error);
        const e = error;
        return res.status(e.status && Number.isFinite(e.status) ? e.status : 500).json({
            ok: false,
            error: e.message || "Error cambiando estado del pedido",
        });
    }
}
async function postPedidoCancelarConsola(req, res) {
    try {
        const { id } = req.params;
        const pedidoId = Number(id);
        if (!Number.isFinite(pedidoId)) {
            return res.status(400).json({ ok: false, error: "pedido id inválido" });
        }
        const { autotanque_id: atqCa, razon_cancelacion, nivel_carburacion, nivel_almacen, } = req.body ?? {};
        const autotanque_id = typeof atqCa === "string"
            ? atqCa.trim()
            : atqCa != null
                ? String(atqCa).trim()
                : "";
        if (!autotanque_id || !/^\d+$/.test(autotanque_id)) {
            return res.status(400).json({ ok: false, error: "autotanque_id requerido" });
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
        await (0, pedidos_service_1.cancelarPedidoAutotanque)({
            pedido_id: String(pedidoId),
            autotanque_id,
            razon_cancelacion: razon,
            nivel_carburacion: nivelCarb,
            nivel_almacen: nivelAlm,
        });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error("[consola] postPedidoCancelarConsola:", error);
        const e = error;
        return res.status(e.status && Number.isFinite(e.status) ? e.status : 500).json({
            ok: false,
            error: e.message || "Error cancelando el pedido",
        });
    }
}
