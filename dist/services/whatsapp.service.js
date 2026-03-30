"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWhatsAppEnabled = isWhatsAppEnabled;
exports.assertWhatsAppConfig = assertWhatsAppConfig;
exports.sendHelloWorldTemplate = sendHelloWorldTemplate;
exports.sendWhatsAppTextMessage = sendWhatsAppTextMessage;
const axios_1 = __importDefault(require("axios"));
/**
 * Servicio aislado para WhatsApp Cloud API (Meta Graph).
 * Usa variables de entorno: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * WHATSAPP_API_VERSION, WHATSAPP_ENABLED, WHATSAPP_WABA_ID (solo metadatos).
 */
function normalizeToDigits(value) {
    const digits = value.replace(/\D/g, "");
    // WhatsApp suele enviar `from` en formato wa_id. En México es común recibir 521XXXXXXXXXX,
    // mientras que la "allowed list" de Cloud API de prueba suele guardarse como +52XXXXXXXXXX.
    // Normalizamos 521 -> 52 para evitar rechazo "Recipient phone number not in allowed list".
    if (digits.startsWith("521") && digits.length === 13) {
        return "52" + digits.slice(3);
    }
    return digits;
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
/**
 * Envía un mensaje de texto (sesión) al número indicado.
 */
async function sendWhatsAppTextMessage(to, bodyText) {
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
    const text = bodyText.trim();
    if (!text) {
        const err = new Error("WHATSAPP_TEXT_EMPTY");
        err.code = "WHATSAPP_TEXT_EMPTY";
        throw err;
    }
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const response = await axios_1.default.post(url, {
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { body: text },
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        timeout: 30000,
    });
    return response.data;
}
