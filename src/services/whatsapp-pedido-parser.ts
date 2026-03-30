/**
 * Parser mínimo para pedidos desde texto WhatsApp (sin IA).
 * Ej.: "300 litros en Costera 123" → litros 300, resto "litros en Costera 123"
 */

export const PRIORIDAD_NORMAL = 3;

export function parsePedidoTextoPlano(raw: string): {
  litros: number | null;
  direccion_texto: string;
} {
  const normalized = raw
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return { litros: null, direccion_texto: "Pedido por WhatsApp (sin texto)" };
  }

  // Prioridad: patrón completo "<numero> litros en <direccion>"
  // Soporta prefijos: "Necesito ...", "Necesito una pipa de ..."
  const mLitrosEn = normalized.match(
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*litros\s*en\s*(.+)$/i
  );
  if (mLitrosEn) {
    const litrosNum = Number(String(mLitrosEn[1]).replace(",", "."));
    const litros = Number.isFinite(litrosNum) ? Math.round(litrosNum) : null;
    let direccion = String(mLitrosEn[2]).trim();

    // Limpieza mínima para remover sobrantes típicos.
    direccion = direccion
      .replace(/^(?:en\\s+)/i, "")
      .replace(/^(?:Necesito\\s+|necesito\\s+)/i, "")
      .replace(
        /^(?:una\\s+pipa\\s+de\\s+|una\\s+pipa\\s+|pipa\\s+de\\s+|pipa\\s+)/i,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,;:]+$/g, "");

    return { litros, direccion_texto: direccion || normalized };
  }

  // Compatibilidad: "<numero> litros <direccion>" (ej. "300 litros costera 123")
  const mLitros = normalized.match(
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*litros\s*(?:en\s*)?(.+)$/i
  );
  if (mLitros) {
    const litrosNum = Number(String(mLitros[1]).replace(",", "."));
    const litros = Number.isFinite(litrosNum) ? Math.round(litrosNum) : null;
    let direccion = String(mLitros[2]).trim();

    direccion = direccion
      .replace(/^(?:en\\s+)/i, "")
      .replace(/^(?:Necesito\\s+|necesito\\s+)/i, "")
      .replace(
        /^(?:una\\s+pipa\\s+de\\s+|una\\s+pipa\\s+|pipa\\s+de\\s+|pipa\\s+)/i,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,;:]+$/g, "");

    return { litros, direccion_texto: direccion || normalized };
  }

  // Fallback: comportamiento anterior (si NO hay patrón completo).
  const m = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!m || m.index === undefined) {
    return { litros: null, direccion_texto: normalized };
  }

  const first = parseFloat(m[1]);
  const litros = Number.isFinite(first) ? Math.round(first) : null;
  const rest = normalized.slice(m.index + m[0].length).trim();

  return {
    litros,
    direccion_texto: rest || normalized,
  };
}
