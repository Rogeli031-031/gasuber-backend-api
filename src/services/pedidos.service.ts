import { db } from "../config/db";

export type PedidoInsertInput = {
  telefono_origen: string;
  cliente_nombre: string;
  direccion_texto: string;
  litros_solicitados: number;
  prioridad: number;
  colonia: string;
  calle: string;
  cp: number;
  numero_exterior: string;
  numero_interior: string;
  tipo_origen: "casa" | "empresa";
  nombre_empresa: string;
};

export type PedidoConsola = {
  id: string;
  telefono_origen: string;
  cliente_nombre: string | null;
  direccion_texto: string;
  litros_solicitados: number | null;
  prioridad: number;
  estado: string;
  created_at: string;
  tipo_origen: string | null;
  nombre_empresa: string | null;
};

function toNullableNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function insertPedido(input: PedidoInsertInput) {
  const { rows } = await db.query(
    `INSERT INTO pedidos (
       telefono_origen,
       cliente_nombre,
       direccion_texto,
       litros_solicitados,
       prioridad,
       colonia,
       calle,
       cp,
       numero_exterior,
       numero_interior,
       tipo_origen,
       nombre_empresa
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id,
               telefono_origen,
               cliente_nombre,
               direccion_texto,
               litros_solicitados,
               prioridad,
               estado,
               created_at,
               tipo_origen,
               nombre_empresa`,
    [
      input.telefono_origen,
      input.cliente_nombre,
      input.direccion_texto,
      input.litros_solicitados,
      input.prioridad,
      input.colonia,
      input.calle,
      input.cp,
      input.numero_exterior,
      input.numero_interior,
      input.tipo_origen,
      input.nombre_empresa,
    ]
  );

  const r = rows[0];
  if (!r) throw new Error("insertPedido: sin fila");

  return {
    id: String(r.id),
    telefono_origen: String(r.telefono_origen),
    cliente_nombre: r.cliente_nombre != null ? String(r.cliente_nombre) : null,
    direccion_texto: String(r.direccion_texto),
    litros_solicitados: toNullableNum(r.litros_solicitados),
    prioridad: Number(r.prioridad),
    estado: String(r.estado),
    created_at: String(r.created_at),
    tipo_origen: r.tipo_origen != null ? String(r.tipo_origen) : null,
    nombre_empresa:
      r.nombre_empresa != null ? String(r.nombre_empresa) : null,
  } satisfies PedidoConsola;
}

export async function listPedidosParaConsola(limit = 100) {
  const lim = Math.min(Math.max(1, limit), 200);

  const { rows } = await db.query(
    `SELECT id::text AS id,
            telefono_origen,
            cliente_nombre,
            direccion_texto,
            litros_solicitados,
            prioridad,
            estado,
            created_at,
            tipo_origen,
            nombre_empresa
     FROM pedidos
     ORDER BY litros_solicitados DESC NULLS LAST, created_at DESC, id DESC
     LIMIT $1`,
    [lim]
  );

  return rows.map((r) => ({
    id: String(r.id),
    telefono_origen: String(r.telefono_origen),
    cliente_nombre: r.cliente_nombre != null ? String(r.cliente_nombre) : null,
    direccion_texto: String(r.direccion_texto),
    litros_solicitados: toNullableNum(r.litros_solicitados),
    prioridad: Number(r.prioridad),
    estado: String(r.estado),
    created_at: String(r.created_at),
    tipo_origen: r.tipo_origen != null ? String(r.tipo_origen) : null,
    nombre_empresa:
      r.nombre_empresa != null ? String(r.nombre_empresa) : null,
  })) satisfies PedidoConsola[];
}

