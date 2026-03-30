"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMetaWebhookPayload = processMetaWebhookPayload;
const pedidos_service_1 = require("./pedidos.service");
const whatsapp_pedido_parser_1 = require("./whatsapp-pedido-parser");
const whatsapp_service_1 = require("./whatsapp.service");
const axios_1 = __importDefault(require("axios"));
/**
 * Estado por defecto al insertar: la BD usa `recibido` (no existe enum `pendiente`).
 */
function buildInsertFromWhatsApp(telefonoOrigen, clienteNombre, direccionTexto, litros, unidadDbId) {
    return {
        unidad_db_id: unidadDbId,
        telefono_origen: telefonoOrigen,
        cliente_nombre: clienteNombre,
        direccion_texto: direccionTexto,
        litros_solicitados: litros,
        prioridad: whatsapp_pedido_parser_1.PRIORIDAD_NORMAL,
        colonia: "N/A",
        calle: "N/A",
        cp: 0,
        numero_exterior: "N/A",
        numero_interior: "N/A",
        tipo_origen: "casa",
        nombre_empresa: "N/A",
    };
}
function contactNameForWaId(contacts, waId) {
    if (!contacts?.length)
        return null;
    const c = contacts.find((x) => x.wa_id === waId);
    const name = c?.profile?.name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
}
async function processMetaWebhookPayload(body) {
    const enabled = process.env.WHATSAPP_ENABLED === "true";
    if (!enabled) {
        console.warn("[whatsapp-webhook] WHATSAPP_ENABLED no es true; se ignora el payload.");
        return;
    }
    const unidadId = process.env.WHATSAPP_DEFAULT_UNIDAD_DB_ID?.trim();
    if (!unidadId) {
        console.error("[whatsapp-webhook] Falta WHATSAPP_DEFAULT_UNIDAD_DB_ID; no se crea pedido.");
        return;
    }
    const root = body;
    const entries = root.entry;
    if (!Array.isArray(entries)) {
        console.warn("[whatsapp-webhook] Payload sin entry[]; se ignora.");
        return;
    }
    for (const ent of entries) {
        const changes = ent.changes;
        if (!Array.isArray(changes))
            continue;
        for (const ch of changes) {
            const value = ch.value;
            if (!value || typeof value !== "object")
                continue;
            const contacts = value.contacts;
            const messages = value.messages;
            if (!Array.isArray(messages))
                continue;
            for (const msg of messages) {
                if (!msg || typeof msg !== "object")
                    continue;
                if (msg.type !== "text") {
                    console.log(`[whatsapp-webhook] Mensaje ignorado (solo texto en esta fase): type=${String(msg.type)} id=${String(msg.id)}`);
                    continue;
                }
                const from = typeof msg.from === "string" ? msg.from.trim() : "";
                const wamid = typeof msg.id === "string" ? msg.id : "";
                const bodyText = msg.text && typeof msg.text.body === "string" ? msg.text.body : "";
                if (!from) {
                    console.warn("[whatsapp-webhook] Mensaje sin from; se ignora.");
                    continue;
                }
                console.log(`[whatsapp-webhook] Mensaje recibido wamid=${wamid} from=${from} body=${JSON.stringify(bodyText.slice(0, 200))}`);
                const clienteNombre = contactNameForWaId(contacts, from) || "Cliente";
                const { litros, direccion_texto } = (0, whatsapp_pedido_parser_1.parsePedidoTextoPlano)(bodyText);
                console.log(`[whatsapp-webhook] Parser: litros=${litros ?? "null"} direccion="${direccion_texto}"`);
                const direccionFinal = direccion_texto.trim() ||
                    `Pedido WhatsApp — ${litros != null ? `${litros} L` : "sin detalle"}`;
                let pedidoId = null;
                try {
                    const pedido = await (0, pedidos_service_1.insertPedido)(buildInsertFromWhatsApp(from, clienteNombre, direccionFinal, litros, unidadId));
                    pedidoId = pedido.id;
                    console.log(`[whatsapp-webhook] Pedido creado id=${pedido.id} telefono=${from} tel_origen=${pedido.telefono_origen}`);
                    console.log(`[whatsapp-webhook] Confirmación (plan): enviar a=${from} pedidoId=${pedido.id}`);
                }
                catch (e) {
                    console.error("[whatsapp-webhook] Error creando pedido (NO se envía confirmación):", e);
                    continue;
                }
                // Confirmación: si falla, NO impedimos creación y respondemos 200 al webhook.
                if (!pedidoId)
                    continue;
                const confirmText = `Pedido recibido. Folio #${pedidoId} en proceso.`;
                try {
                    await (0, whatsapp_service_1.sendWhatsAppTextMessage)(from, confirmText);
                    console.log(`[whatsapp-webhook] Confirmación enviada OK a=${from} pedidoId=${pedidoId}`);
                }
                catch (e) {
                    if (axios_1.default.isAxiosError(e)) {
                        const status = e.response?.status;
                        const message = typeof e.message === "string" ? e.message : String(e.message);
                        const data = e.response?.data;
                        console.error(`[whatsapp-webhook] Error confirmación WhatsApp status=${status} message="${message}"`, data != null ? data : "");
                        try {
                            console.error(`[whatsapp-webhook] Detalle confirmación WhatsApp response.data (stringified): ${JSON.stringify(data, null, 2)}`);
                        }
                        catch {
                            // ignore
                        }
                    }
                    else {
                        console.error("[whatsapp-webhook] Error confirmación WhatsApp (no axios):", e);
                    }
                }
            }
        }
    }
}
