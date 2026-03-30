/**
 * Parser mínimo para pedidos desde texto WhatsApp (sin IA).
 * Ej.: "300 litros en Costera 123" → litros 300, resto "litros en Costera 123"
 */

export const PRIORIDAD_NORMAL = 3;

export function parsePedidoTextoPlano(raw: string): {
  litros: number | null;
  direccion_texto: string;
} {
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
