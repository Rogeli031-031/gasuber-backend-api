import { db } from "../config/db";

export type TarjetaRpiRow = {
  id: string;
  nombre: string;
};

export type TipoActivoTarjeta = "estacion" | "almacen" | "autotanque";

export async function listTarjetasRpi(): Promise<TarjetaRpiRow[]> {
  const { rows } = await db.query<{ id: string; nombre: string }>(
    `SELECT id::text, "NOMBRE" AS nombre
     FROM "ID-TARJETA"
     ORDER BY "NOMBRE" ASC`
  );
  return rows;
}

/**
 * Asigna o quita la tarjeta RPI de un activo (columna tarjeta_id, opción B).
 */
export async function setTarjetaActivo(params: {
  tipo: TipoActivoTarjeta;
  activoId: string;
  tarjetaId: string | null;
}): Promise<void> {
  const aid = Number(params.activoId);
  if (!Number.isFinite(aid) || aid <= 0) {
    throw Object.assign(new Error("activo_id inválido"), { code: "VALIDATION" });
  }

  let tid: number | null = null;
  if (params.tarjetaId != null && String(params.tarjetaId).trim() !== "") {
    const n = Number(params.tarjetaId);
    if (!Number.isFinite(n) || n <= 0) {
      throw Object.assign(new Error("tarjeta_id inválido"), { code: "VALIDATION" });
    }
    tid = Math.round(n);
    const chk = await db.query(`SELECT 1 FROM "ID-TARJETA" WHERE id = $1::bigint LIMIT 1`, [
      tid,
    ]);
    if (!chk.rows.length) {
      throw Object.assign(new Error("La tarjeta no existe en ID-TARJETA"), {
        code: "VALIDATION",
      });
    }
  }

  let sql: string;
  switch (params.tipo) {
    case "estacion":
      sql = `UPDATE "ID-PDV-ESTACION" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
      break;
    case "almacen":
      sql = `UPDATE "ID-PDV-ALMACEN" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
      break;
    case "autotanque":
      sql = `UPDATE "ID-PDV-AUTOTANQUE" SET tarjeta_id = $1 WHERE id = $2::bigint RETURNING id`;
      break;
    default:
      throw Object.assign(new Error("tipo inválido"), { code: "VALIDATION" });
  }

  const r = await db.query<{ id: string }>(sql, [tid, aid]);
  if (!r.rows.length) {
    throw Object.assign(new Error("Activo no encontrado"), { code: "NOT_FOUND" });
  }
}
