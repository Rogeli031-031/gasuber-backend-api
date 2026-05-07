/**
 * Evalúa celdas de expediente (fecha vencida o dato ausente) para estilo y tabla Alarmas.
 * Fechas en formatos usados en datos de Puebla: DD-mmm-YY, DD/MM/YYYY, mmm-YY (fin de mes).
 */

const MESES: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

function normalizarMesToken(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .slice(0, 3);
}

/**
 * Instante actual (equivalente a `NOW()` en PostgreSQL) en cada evaluación:
 * al abrir la consola, al cargar una tabla o en el barrido programado.
 */
function ahoraVigencia(): Date {
  return new Date();
}

function esAusente(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const t = String(raw).trim();
  if (!t) return true;
  if (t === "—" || t === "-" || t === "–") return true;
  return false;
}

/** Fin del mes UTC (último instante) para expiración tipo mar-27. */
function finDeMesUtc(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59, 999));
}

function anioCompletoDosCifras(yy: number): number {
  if (yy >= 100) return yy;
  return yy < 50 ? 2000 + yy : 1900 + yy;
}

/**
 * DD-mmm-YY (ej. 27-ene-27) o DD/MMM/YY con mes 3 letras.
 */
function parseDiaMesAnioCorto(s: string): Date | null {
  const m = s.match(/^(\d{1,2})-([a-z]+)-(\d{2,4})$/i);
  if (!m) return null;
  const d = Number(m[1]);
  const mon = MESES[normalizarMesToken(m[2])];
  if (mon === undefined || !Number.isFinite(d) || d < 1 || d > 31) return null;
  const yRaw = Number(m[3]);
  if (!Number.isFinite(yRaw)) return null;
  const y = yRaw < 100 ? anioCompletoDosCifras(yRaw) : yRaw;
  const end = new Date(Date.UTC(y, mon + 1, 0, 23, 59, 59, 999));
  const maxD = end.getUTCDate();
  if (d > maxD) return null;
  return new Date(Date.UTC(y, mon, d, 23, 59, 59, 999));
}

/** DD/MM/YYYY */
function parseSlashDmy(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return null;
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const end = new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59, 999));
  if (d > end.getUTCDate()) return null;
  return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
}

/** mmm-YY → fin de ese mes (ej. mar-27 = marzo 2027). */
function parseMesAnioCorto(s: string): Date | null {
  const m = s.match(/^([a-z]+)-(\d{2,4})$/i);
  if (!m) return null;
  const mon = MESES[normalizarMesToken(m[1])];
  if (mon === undefined) return null;
  const yRaw = Number(m[2]);
  if (!Number.isFinite(yRaw)) return null;
  const y = yRaw < 100 ? anioCompletoDosCifras(yRaw) : yRaw;
  return finDeMesUtc(y, mon);
}

function parseComoFinVigencia(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  return (
    parseSlashDmy(t) ??
    parseDiaMesAnioCorto(t) ??
    parseMesAnioCorto(t) ??
    null
  );
}

export type VigilanciaTipo = "fecha" | "presencia";

/**
 * true = celda en rojo (vencido, ausente o no parseable como fecha cuando se exige fecha).
 */
export function celdaRequiereAlerta(
  vigilancia: VigilanciaTipo | undefined,
  raw: string | null | undefined
): boolean {
  if (!vigilancia) return false;
  if (vigilancia === "presencia") {
    return esAusente(raw);
  }
  if (esAusente(raw)) return true;
  const fin = parseComoFinVigencia(String(raw));
  if (!fin) return true;
  return fin < ahoraVigencia();
}

export function motivoAlerta(
  vigilancia: VigilanciaTipo | undefined,
  raw: string | null | undefined
): "ausente" | "vencido" | "fecha_invalida" | null {
  if (!vigilancia) return null;
  if (vigilancia === "presencia") {
    return esAusente(raw) ? "ausente" : null;
  }
  if (esAusente(raw)) return "ausente";
  const fin = parseComoFinVigencia(String(raw));
  if (!fin) return "fecha_invalida";
  return fin < ahoraVigencia() ? "vencido" : null;
}
