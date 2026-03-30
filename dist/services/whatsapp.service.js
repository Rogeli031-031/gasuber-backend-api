"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWhatsAppEnabled = isWhatsAppEnabled;
exports.assertWhatsAppConfig = assertWhatsAppConfig;
exports.sendHelloWorldTemplate = sendHelloWorldTemplate;
const axios_1 = __importDefault(require("axios"));
/**
 * Servicio aislado para WhatsApp Cloud API (Meta Graph).
 * Usa variables de entorno: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * WHATSAPP_API_VERSION, WHATSAPP_ENABLED, WHATSAPP_WABA_ID (solo metadatos).
 */
function normalizeToDigits(value) {
    return value.replace(/\D/g, "");
}
function isWhatsAppEnabled() {
    return process.env.WHATSAPP_ENABLED === "true";
}
function assertWhatsAppConfig() {
    if (!isWhatsAppEnabled()) {
        const err = new Error("WHATSAPP_DISABLED");
        err.code = "WHATSAPP_DISABLED";
        throw err;
    }
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
        const err = new Error("WHATSAPP_CONFIG_INCOMPLETE");
        err.code = "WHATSAPP_CONFIG_INCOMPLETE";
        throw err;
    }
}
/**
 * Envía la plantilla oficial `hello_world` (idioma en_US, estándar de Meta).
 * @param to Número en formato internacional (con o sin +); se normaliza a dígitos.
 */
async function sendHelloWorldTemplate(to) {
    assertWhatsAppConfig();
    const token = process.env.WHATSAPP_TOKEN.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID.trim();
    const version = (process.env.WHATSAPP_API_VERSION || "v22.0").trim();
    const toDigits = normalizeToDigits(to);
    if (!toDigits) {
        const err = new Error("WHATSAPP_TO_INVALID");
        err.code = "WHATSAPP_TO_INVALID";
        throw err;
    }
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const response = await axios_1.default.post(url, {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
            name: "hello_world",
            language: {
                code: "en_US",
            },
        },
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        timeout: 30000,
    });
    return response.data;
}
