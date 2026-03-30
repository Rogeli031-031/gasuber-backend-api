"use strict";
/**
 * Parser mínimo para pedidos desde texto WhatsApp (sin IA).
 * Ej.: "300 litros en Costera 123" → litros 300, resto "litros en Costera 123"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORIDAD_NORMAL = void 0;
exports.parsePedidoTextoPlano = parsePedidoTextoPlano;
exports.PRIORIDAD_NORMAL = 3;
function parsePedidoTextoPlano(raw) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { litros: null, direccion_texto: "Pedido por WhatsApp (sin texto)" };
    }
    const m = trimmed.match(/(\d+(?:\.\d+)?)/);
    if (!m || m.index === undefined) {
        return { litros: null, direccion_texto: trimmed };
    }
    const first = parseFloat(m[1]);
    const litros = Number.isFinite(first) ? Math.round(first) : null;
    const rest = trimmed.slice(m.index + m[0].length).trim();
    return {
        litros,
        direccion_texto: rest || trimmed,
    };
}
