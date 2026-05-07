"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANTA_PUEBLA_ID = void 0;
exports.esSeccionInformacionAutotanque = esSeccionInformacionAutotanque;
exports.construirTodasAlarmasInformacionAutotanque = construirTodasAlarmasInformacionAutotanque;
exports.reemplazarAlarmasInformacionAutotanque = reemplazarAlarmasInformacionAutotanque;
exports.sincronizarYContarAlarmasInformacionAutotanque = sincronizarYContarAlarmasInformacionAutotanque;
exports.getInformacionAutotanqueTabla = getInformacionAutotanqueTabla;
exports.getResumenAlarmasInformacionAutotanque = getResumenAlarmasInformacionAutotanque;
exports.barridoAlarmasInformacionAutotanqueTodasLasPlantas = barridoAlarmasInformacionAutotanqueTodasLasPlantas;
const db_1 = require("../config/db");
const plantasPdv_service_1 = require("./plantasPdv.service");
const informacionAutotanqueVigencia_1 = require("./informacionAutotanqueVigencia");
/** Puebla: datos de expediente cargados en código; otras plantas devuelven solo NUMERO (BD) hasta migrar a tablas. */
exports.PLANTA_PUEBLA_ID = "1";
const SECCIONES = [
    "tanque_almacen",
    "tanque_carburacion",
    "permisos_cne",
    "nom_0013",
    "transito",
];
const TITULOS = {
    tanque_almacen: "Tanque almacén",
    tanque_carburacion: "Tanque de carburación",
    permisos_cne: "Permisos CNE",
    nom_0013: "NOM 0013 SEDG 2002 tanque",
    transito: "Tránsito",
};
const COLUMNAS = {
    tanque_almacen: [
        { key: "numero", etiqueta: "NUMERO" },
        { key: "combustible", etiqueta: "COMBUSTIBLE" },
        { key: "marca_recipiente", etiqueta: "MARCA DEL RECIPIENTE" },
        { key: "capacidad_litros", etiqueta: "CAPACIDAD DEL RECIPIENTE (LITROS)" },
        { key: "numero_serie", etiqueta: "No. De SERIE" },
        { key: "anio_fabricacion", etiqueta: "AÑO DE FABRICACIÓN" },
    ],
    tanque_carburacion: [
        { key: "numero", etiqueta: "NUMERO" },
        { key: "marca_recipiente", etiqueta: "MARCA DEL RECIPIENTE" },
        { key: "capacidad_litros", etiqueta: "CAPACIDAD DEL RECIPIENTE (LITROS)" },
        { key: "numero_serie", etiqueta: "No. De SERIE" },
        { key: "anio_fabricacion", etiqueta: "AÑO DE FABRICACIÓN" },
    ],
    permisos_cne: [
        { key: "numero", etiqueta: "NUMERO" },
        {
            key: "dictamen_007_005_vence",
            etiqueta: "DICTAMEN 007 EM Y 005 VENCE EN:",
            vigilancia: "fecha",
        },
        {
            key: "poliza_flotilla_vence",
            etiqueta: "POLIZA FLOTILLA VENCE EN: (NINGUNA CONSIDERA RESPONSABILIDAD ECOLOGICA)",
            vigilancia: "fecha",
        },
        { key: "poliza_rc_vence", etiqueta: "POLIZA DE RESPONSABILIDAD CIVIL", vigilancia: "fecha" },
    ],
    nom_0013: [
        { key: "numero", etiqueta: "NUMERO" },
        { key: "folio_ultrasonido", etiqueta: "FOLIO DE ULTRASONIDO", vigilancia: "presencia" },
        { key: "vence", etiqueta: "VENCE EN", vigilancia: "fecha" },
    ],
    transito: [
        { key: "numero", etiqueta: "NUMERO" },
        { key: "tarjeta_circulacion", etiqueta: "TARJETA DE CIRCULACIÓN", vigilancia: "presencia" },
        { key: "permiso_carga_vence", etiqueta: "PERMISO DE CARGA VENCE EN", vigilancia: "fecha" },
        { key: "emplacamiento", etiqueta: "EMPLACAMIENTO", vigilancia: "presencia" },
        { key: "verificacion_gases", etiqueta: "VERIFICACION DE GASES", vigilancia: "presencia" },
        { key: "extintores_vence", etiqueta: "EXTINTORES VENCE EN", vigilancia: "fecha" },
    ],
};
const PUEBLA_TANQUE_ALMACEN = {
    "T-11": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5800",
        numero_serie: "VBT3986",
        anio_fabricacion: "1999",
    },
    "T-12": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5900",
        numero_serie: "VBT3602",
        anio_fabricacion: "1998",
    },
    "T-13": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5800",
        numero_serie: "VBT3980",
        anio_fabricacion: "1999",
    },
    "T-14": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5800",
        numero_serie: "VBT3985",
        anio_fabricacion: "1999",
    },
    "T-15": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5800",
        numero_serie: "VBT4009",
        anio_fabricacion: "1999",
    },
    "T-16": {
        combustible: "GAS LP",
        marca_recipiente: "INZA",
        capacidad_litros: "5800",
        numero_serie: "TP758",
        anio_fabricacion: "2020",
    },
    "T-17": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "5900",
        numero_serie: "VBT3573",
        anio_fabricacion: "1998",
    },
    "T-18": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "12900",
        numero_serie: "VBT3488",
        anio_fabricacion: "1998",
    },
    "T-24": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "12900",
        numero_serie: "VBT3508",
        anio_fabricacion: "1998",
    },
    "T-65": {
        combustible: "GAS LP",
        marca_recipiente: "TATSA",
        capacidad_litros: "12900",
        numero_serie: "VBT3483",
        anio_fabricacion: "1998",
    },
    "T-70": {
        combustible: "DIESEL",
        marca_recipiente: "TATSA",
        capacidad_litros: "12500",
        numero_serie: "VBT245",
        anio_fabricacion: "1969",
    },
};
const PUEBLA_TANQUE_CARB = {
    "T-11": { marca_recipiente: "TATSA", capacidad_litros: "120", numero_serie: "124", anio_fabricacion: "1999" },
    "T-12": { marca_recipiente: "CYTSA", capacidad_litros: "130", numero_serie: "G10638", anio_fabricacion: "1999" },
    "T-13": { marca_recipiente: "TATSA", capacidad_litros: "120", numero_serie: "375", anio_fabricacion: "1992" },
    "T-14": { marca_recipiente: "TATSA", capacidad_litros: "120", numero_serie: "390", anio_fabricacion: "1992" },
    "T-15": { marca_recipiente: "TATSA", capacidad_litros: "120", numero_serie: "374", anio_fabricacion: "1992" },
    "T-16": { marca_recipiente: "INGUSA", capacidad_litros: "130", numero_serie: "G16466", anio_fabricacion: "1998" },
    "T-17": { marca_recipiente: "INGUSA", capacidad_litros: "130", numero_serie: "G10740", anio_fabricacion: "1999" },
    "T-18": { marca_recipiente: "INGUSA", capacidad_litros: "130", numero_serie: "G10748", anio_fabricacion: "1999" },
    "T-24": { marca_recipiente: "CYTSA", capacidad_litros: "130", numero_serie: "G23958", anio_fabricacion: "1998" },
    "T-65": { marca_recipiente: "CYTSA", capacidad_litros: "130", numero_serie: "G23934", anio_fabricacion: "1999" },
    "T-70": { marca_recipiente: "DIESEL", capacidad_litros: null, numero_serie: null, anio_fabricacion: null },
};
const PUEBLA_PERMISOS = {
    "T-11": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-12": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-13": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-14": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-15": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-16": { dictamen_007_005_vence: null, poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-17": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-18": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-24": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-65": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "01-nov-26", poliza_rc_vence: "11-nov-26" },
    "T-70": { dictamen_007_005_vence: "27-ene-27", poliza_flotilla_vence: "09-abr-26", poliza_rc_vence: "11-nov-26" },
};
const PUEBLA_NOM = {
    "T-11": { folio_ultrasonido: "ULT-11/24-0462", vence: "16-nov-29" },
    "T-12": { folio_ultrasonido: "ULT-11/24-0463", vence: "16-nov-29" },
    "T-13": { folio_ultrasonido: "ULT-11/24-0464", vence: "16-nov-29" },
    "T-14": { folio_ultrasonido: "ULT-11/24-0465", vence: "16-nov-29" },
    "T-15": { folio_ultrasonido: "ULT-11/24-0466", vence: "16-nov-29" },
    "T-16": { folio_ultrasonido: null, vence: null },
    "T-17": { folio_ultrasonido: "ULT-11/24-0467", vence: "16-nov-29" },
    "T-18": { folio_ultrasonido: "ULT-11/24-0468", vence: "16-nov-29" },
    "T-24": { folio_ultrasonido: "ULT-11/24-0469", vence: "16-nov-29" },
    "T-65": { folio_ultrasonido: "ULT-11/24-0470", vence: "16-nov-29" },
    "T-70": { folio_ultrasonido: "ULT-11/24-0471", vence: "16-nov-29" },
};
const TARJETA_CIRC_TX = "PERMANENTE (AL HACER NUEVO EMPLACAMIENTO ES NECESARIO VOLVER A SACARLA)";
const PUEBLA_TRANSITO = {
    "T-11": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-12": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-13": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-14": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-15": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-16": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-17": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-18": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-24": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: "13/10/2026",
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-65": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: null,
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
    "T-70": {
        tarjeta_circulacion: TARJETA_CIRC_TX,
        permiso_carga_vence: null,
        emplacamiento: null,
        verificacion_gases: null,
        extintores_vence: "mar-27",
    },
};
const PUEBLA_POR_SECCION = {
    tanque_almacen: PUEBLA_TANQUE_ALMACEN,
    tanque_carburacion: PUEBLA_TANQUE_CARB,
    permisos_cne: PUEBLA_PERMISOS,
    nom_0013: PUEBLA_NOM,
    transito: PUEBLA_TRANSITO,
};
function esSeccionInformacionAutotanque(s) {
    return SECCIONES.includes(s);
}
function filaDesdeAutotanque(at, seccion, seedMap) {
    const columnas = COLUMNAS[seccion];
    const numero = at.numero;
    const seed = seedMap ? seedMap[numero] ?? null : null;
    const row = {};
    for (const col of columnas) {
        if (col.key === "numero") {
            row.numero = numero;
            continue;
        }
        row[col.key] = seed && col.key in seed ? seed[col.key] ?? null : null;
    }
    return row;
}
function alertasParaFila(seccion, fila) {
    const columnas = COLUMNAS[seccion];
    const alertas = {};
    for (const col of columnas) {
        if (!col.vigilancia)
            continue;
        alertas[col.key] = (0, informacionAutotanqueVigencia_1.celdaRequiereAlerta)(col.vigilancia, fila[col.key]);
    }
    return alertas;
}
function construirAlarmasParaSeccion(seccion, autotanques, seedMap) {
    const columnas = COLUMNAS[seccion];
    const out = [];
    for (const at of autotanques) {
        const fila = filaDesdeAutotanque(at, seccion, seedMap);
        for (const col of columnas) {
            if (!col.vigilancia)
                continue;
            const raw = fila[col.key];
            if (!(0, informacionAutotanqueVigencia_1.celdaRequiereAlerta)(col.vigilancia, raw))
                continue;
            const motivo = (0, informacionAutotanqueVigencia_1.motivoAlerta)(col.vigilancia, raw);
            out.push({
                autotanque_id: at.id,
                unidad_clave: at.numero,
                tipo: `informacion_autotanque|${seccion}|${col.key}`,
                detalle: {
                    seccion,
                    columna: col.key,
                    etiqueta: col.etiqueta,
                    numero: at.numero,
                    motivo,
                    valor: raw ?? null,
                },
            });
        }
    }
    return out;
}
function construirTodasAlarmasInformacionAutotanque(plantaId, autotanques) {
    const datosPuebla = plantaId === exports.PLANTA_PUEBLA_ID;
    const all = [];
    for (const seccion of SECCIONES) {
        const seedMap = datosPuebla ? PUEBLA_POR_SECCION[seccion] : null;
        all.push(...construirAlarmasParaSeccion(seccion, autotanques, seedMap));
    }
    return all;
}
const ORIGEN_INFORMACION = "informacion_autotanque";
async function reemplazarAlarmasInformacionAutotanque(plantaId, alarmas) {
    const client = await db_1.db.connect();
    try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM "Alarmas"
       WHERE origen = $1
         AND autotanque_id IN (
           SELECT id FROM "ID-PDV-AUTOTANQUE" WHERE planta_id = $2::bigint
         )`, [ORIGEN_INFORMACION, plantaId]);
        for (const a of alarmas) {
            await client.query(`INSERT INTO "Alarmas" (
           autotanque_id, unidad_clave, tipo, umbral_kmh, velocidad_kmh, activa, origen, detalle
         ) VALUES ($1::bigint, $2, $3, $4::numeric, $5::numeric, TRUE, $6, $7::jsonb)`, [
                a.autotanque_id,
                a.unidad_clave,
                a.tipo,
                0,
                0,
                ORIGEN_INFORMACION,
                JSON.stringify(a.detalle),
            ]);
        }
        await client.query("COMMIT");
    }
    catch (e) {
        await client.query("ROLLBACK");
        throw e;
    }
    finally {
        client.release();
    }
}
/** Sincroniza Alarmas para expediente y devuelve si quedó alguna activa. */
async function sincronizarYContarAlarmasInformacionAutotanque(plantaId, autotanques) {
    const alarmas = construirTodasAlarmasInformacionAutotanque(plantaId, autotanques);
    await reemplazarAlarmasInformacionAutotanque(plantaId, alarmas);
    return {
        alarmas,
        planta_alarmas_informacion: alarmas.length > 0,
    };
}
async function getInformacionAutotanqueTabla(plantaId, seccion) {
    const columnas = COLUMNAS[seccion];
    const datos_cargados = plantaId === exports.PLANTA_PUEBLA_ID;
    const seedMap = datos_cargados ? PUEBLA_POR_SECCION[seccion] : null;
    const autotanques = await (0, plantasPdv_service_1.listAutotanquesPorPlanta)(plantaId);
    const { planta_alarmas_informacion } = await sincronizarYContarAlarmasInformacionAutotanque(plantaId, autotanques);
    const filas = [];
    const alertas_celda = [];
    for (const at of autotanques) {
        const row = filaDesdeAutotanque(at, seccion, seedMap);
        filas.push(row);
        alertas_celda.push(alertasParaFila(seccion, row));
    }
    return {
        seccion,
        titulo: TITULOS[seccion],
        datos_cargados,
        columnas,
        filas,
        alertas_celda,
        planta_alarmas_informacion,
    };
}
/** Solo icono / badge sin cargar una tabla concreta. */
async function getResumenAlarmasInformacionAutotanque(plantaId) {
    const autotanques = await (0, plantasPdv_service_1.listAutotanquesPorPlanta)(plantaId);
    const { planta_alarmas_informacion } = await sincronizarYContarAlarmasInformacionAutotanque(plantaId, autotanques);
    return { planta_alarmas_informacion };
}
/**
 * Barrido para todas las plantas que tienen autotanques (p. ej. cron 05:00).
 * Misma lógica que al abrir Información: NOW() implícito vía `new Date()` en vigencia.
 */
async function barridoAlarmasInformacionAutotanqueTodasLasPlantas() {
    const { rows } = await db_1.db.query(`SELECT DISTINCT planta_id::text AS id
     FROM "ID-PDV-AUTOTANQUE"
     ORDER BY planta_id::bigint`);
    let total_alarmas = 0;
    for (const r of rows) {
        const autotanques = await (0, plantasPdv_service_1.listAutotanquesPorPlanta)(r.id);
        const { alarmas } = await sincronizarYContarAlarmasInformacionAutotanque(r.id, autotanques);
        total_alarmas += alarmas.length;
    }
    return { plantas: rows.length, total_alarmas };
}
