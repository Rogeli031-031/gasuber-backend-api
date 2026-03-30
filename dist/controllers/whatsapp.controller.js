"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postWhatsAppTest = postWhatsAppTest;
exports.getWhatsAppWebhook = getWhatsAppWebhook;
exports.postWhatsAppWebhook = postWhatsAppWebhook;
const axios_1 = __importDefault(require("axios"));
const whatsapp_service_1 = require("../services/whatsapp.service");
const whatsapp_webhook_processor_1 = require("../services/whatsapp-webhook.processor");
/**
 * POST /api/whatsapp/test
 * Body opcional: { "to": "5274..." } — si falta, usa WHATSAPP_TO_TEST.
 */
async function postWhatsAppTest(req, res) {
    try {
        const raw = req.body &&
            typeof req.body === "object" &&
            req.body !== null &&
            "to" in req.body
            ? req.body.to
            : undefined;
        const fromBody = typeof raw === "string" && raw.trim() ? raw.trim() : "";
        const fromEnv = process.env.WHATSAPP_TO_TEST?.trim() || "";
        const to = fromBody || fromEnv;
        if (!to) {
            res.status(400).json({
                ok: false,
                error: 'Falta destino: envía { "to": "..." } en el body o define WHATSAPP_TO_TEST en Render.',
            });
            return;
        }
        const data = await (0, whatsapp_service_1.sendHelloWorldTemplate)(to);
        res.json({
            ok: true,
            template: "hello_world",
            waba_id: process.env.WHATSAPP_WABA_ID ?? null,
            data,
        });
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.data !== undefined) {
            res.status(err.response.status).json({
                ok: false,
                error: "whatsapp_api_error",
                data: err.response.data,
            });
            return;
        }
        const e = err;
        if (e.code === "WHATSAPP_DISABLED") {
            res.status(503).json({
                ok: false,
                error: "WhatsApp deshabilitado: WHATSAPP_ENABLED debe ser true.",
            });
            return;
        }
        if (e.code === "WHATSAPP_CONFIG_INCOMPLETE") {
            res.status(500).json({
                ok: false,
                error: "Configuración incompleta: WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID son obligatorios.",
            });
            return;
        }
        if (e.code === "WHATSAPP_TO_INVALID") {
            res.status(400).json({
                ok: false,
                error: "Número de destino inválido (sin dígitos útiles).",
            });
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({
            ok: false,
            error: message,
        });
    }
}
function firstQueryString(v) {
    if (typeof v === "string" && v.length > 0)
        return v;
    if (Array.isArray(v) && typeof v[0] === "string")
        return v[0];
    return undefined;
}
/**
 * GET /api/whatsapp/webhook — verificación Meta (suscripción).
 */
function getWhatsAppWebhook(req, res) {
    const mode = firstQueryString(req.query["hub.mode"]);
    const verifyToken = firstQueryString(req.query["hub.verify_token"]);
    const challenge = firstQueryString(req.query["hub.challenge"]);
    if (mode !== "subscribe") {
        res.status(403).send("Forbidden");
        return;
    }
    const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
    if (!expected || verifyToken !== expected) {
        res.status(403).send("Forbidden");
        return;
    }
    if (challenge && challenge.length > 0) {
        res.status(200).send(challenge);
        return;
    }
    res.status(400).send("Bad Request");
}
/**
 * POST /api/whatsapp/webhook — mensajes entrantes Meta Cloud API.
 * Responde 200 de inmediato; el procesamiento es asíncrono.
 */
function postWhatsAppWebhook(req, res) {
    res.status(200).send("OK");
    setImmediate(() => {
        (0, whatsapp_webhook_processor_1.processMetaWebhookPayload)(req.body).catch((e) => {
            console.error("[whatsapp-webhook] Error en proceso asíncrono:", e);
        });
    });
}
