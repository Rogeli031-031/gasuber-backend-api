import { db } from "../config/db";

export type PedidoInsertInput = {
  unidad_db_id: string;
  telefono_origen: string;
  cliente_nombre: string;
  direccion_texto: string;
  litros_solicitados: number | null;
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
  unidad_db_id?: string | null;
  autotanque_id?: string | null;
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
       unidad_db_id,
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id,
               unidad_db_id,
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
      input.unidad_db_id,
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
    unidad_db_id: r.unidad_db_id != null ? String(r.unidad_db_id) : null,
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

export async function listPedidosParaConsolaUnidad(
  unidad_db_id: string,
  limit = 100
) {
  const lim = Math.min(Math.max(1, limit), 200);

  const { rows } = await db.query(
    `SELECT id::text AS id,
            unidad_db_id::text AS unidad_db_id,
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
     WHERE (unidad_db_id = $1 OR unidad_db_id IS NULL)
       AND estado IN ('recibido','validando','cancelado')
     ORDER BY (estado = 'cancelado')::int ASC,
              litros_solicitados DESC NULLS LAST,
              created_at DESC,
              id DESC
     LIMIT $2`,
    [unidad_db_id, lim]
  );

  return rows.map((r) => ({
    id: String(r.id),
    unidad_db_id: r.unidad_db_id != null ? String(r.unidad_db_id) : null,
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

function toFiniteNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function avanzarPedidoEstado(args: {
  pedido_id: string;
  unidad_db_id: string;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
}) {
  const pedidoId = Number(args.pedido_id);
  const unidadId = Number(args.unidad_db_id);
  if (!Number.isFinite(pedidoId) || !Number.isFinite(unidadId)) {
    throw new Error("pedido_id o unidad_db_id inválidos");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      estado: string;
      unidad_db_id: string | null;
      telefono_origen: string;
    }>(
      `SELECT id::text AS id,
              estado::text AS estado,
              unidad_db_id::text AS unidad_db_id,
              telefono_origen::text AS telefono_origen
       FROM pedidos
       WHERE id = $1
       FOR UPDATE`,
      [pedidoId]
    );
    const p = rows[0];
    if (!p) throw new Error("pedido no encontrado");
    if (p.unidad_db_id == null || p.unidad_db_id === "") {
      // Compatibilidad: pedidos antiguos sin unidad asignada.
      await client.query(`UPDATE pedidos SET unidad_db_id = $1 WHERE id = $2`, [
        unidadId,
        pedidoId,
      ]);
    } else if (Number(p.unidad_db_id) !== unidadId) {
      throw new Error("pedido no pertenece a la unidad seleccionada");
    }

    const estadoActual = p.estado;
    let estadoNuevo: string;
    if (estadoActual === "recibido") {
      const { rows: conflictRows } = await client.query<{
        ok: number;
      }>(
        `SELECT 1 as ok
         FROM pedidos
         WHERE (unidad_db_id = $1 OR unidad_db_id IS NULL)
           AND estado = 'validando'
           AND id <> $2
         LIMIT 1
         FOR UPDATE`,
        [unidadId, pedidoId]
      );
      if (conflictRows.length > 0) {
        throw Object.assign(new Error("Ya existe una solicitud en En proceso para esta unidad."), {
          status: 409,
        });
      }
      estadoNuevo = "validando";
    } else if (estadoActual === "validando") {
      estadoNuevo = "convertido_servicio";
    } else {
      throw Object.assign(
        new Error("Transición no permitida (solo recibidos->validando y validando->convertido_servicio)."),
        { status: 400 }
      );
    }

    await client.query(`UPDATE pedidos SET estado = $1 WHERE id = $2`, [
      estadoNuevo,
      pedidoId,
    ]);

    const nivelCarb = toFiniteNullableNumber(args.nivel_carburacion);
    const nivelAlm = toFiniteNullableNumber(args.nivel_almacen);

    await client.query(
      `INSERT INTO pedido_estado_historial (
         pedido_id, unidad_db_id, estado_anterior, estado_nuevo,
         nivel_carburacion, nivel_almacen
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pedidoId, unidadId, estadoActual, estadoNuevo, nivelCarb, nivelAlm]
    );

    await client.query("COMMIT");
    return {
      pedido_id: String(pedidoId),
      estado_anterior: estadoActual,
      estado_nuevo: estadoNuevo,
      telefono_origen: String(p.telefono_origen),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelarPedido(args: {
  pedido_id: string;
  unidad_db_id: string;
  razon_cancelacion: string;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
}) {
  const pedidoId = Number(args.pedido_id);
  const unidadId = Number(args.unidad_db_id);
  if (!Number.isFinite(pedidoId) || !Number.isFinite(unidadId)) {
    throw new Error("pedido_id o unidad_db_id inválidos");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      estado: string;
      unidad_db_id: string | null;
    }>(
      `SELECT id::text AS id, estado::text AS estado, unidad_db_id::text AS unidad_db_id
       FROM pedidos
       WHERE id = $1
       FOR UPDATE`,
      [pedidoId]
    );
    const p = rows[0];
    if (!p) throw new Error("pedido no encontrado");
    if (p.unidad_db_id == null || p.unidad_db_id === "") {
      await client.query(`UPDATE pedidos SET unidad_db_id = $1 WHERE id = $2`, [
        unidadId,
        pedidoId,
      ]);
    } else if (Number(p.unidad_db_id) !== unidadId) {
      throw new Error("pedido no pertenece a la unidad seleccionada");
    }

    const estadoActual = p.estado;
    if (estadoActual === "cancelado" || estadoActual === "convertido_servicio") {
      throw Object.assign(new Error("No se puede cancelar este pedido."), { status: 400 });
    }
    if (estadoActual !== "recibido" && estadoActual !== "validando") {
      throw Object.assign(new Error("Transición no permitida (solo recibidos y validando)."), { status: 400 });
    }

    await client.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id = $1`, [pedidoId]);

    const nivelCarb = toFiniteNullableNumber(args.nivel_carburacion);
    const nivelAlm = toFiniteNullableNumber(args.nivel_almacen);

    await client.query(
      `INSERT INTO pedido_estado_historial (
         pedido_id, unidad_db_id, estado_anterior, estado_nuevo,
         razon_cancelacion,
         nivel_carburacion, nivel_almacen
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [pedidoId, unidadId, estadoActual, "cancelado", args.razon_cancelacion, nivelCarb, nivelAlm]
    );

    await client.query("COMMIT");
    return { pedido_id: String(pedidoId), estado_anterior: estadoActual, estado_nuevo: "cancelado" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export type PedidoInsertAutotanqueInput = Omit<PedidoInsertInput, "unidad_db_id"> & {
  autotanque_id: string;
};

export async function insertPedidoAutotanque(input: PedidoInsertAutotanqueInput) {
  const { rows } = await db.query(
    `INSERT INTO pedidos (
       unidad_db_id,
       autotanque_id,
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
     VALUES (NULL, $1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id,
               unidad_db_id,
               autotanque_id::text AS autotanque_id,
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
      input.autotanque_id,
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
  if (!r) throw new Error("insertPedidoAutotanque: sin fila");

  return {
    id: String(r.id),
    unidad_db_id: r.unidad_db_id != null ? String(r.unidad_db_id) : null,
    autotanque_id: (r as { autotanque_id?: unknown }).autotanque_id != null
      ? String((r as { autotanque_id: unknown }).autotanque_id)
      : null,
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

export async function listPedidosParaConsolaAutotanque(
  autotanque_id: string,
  limit = 100
) {
  const lim = Math.min(Math.max(1, limit), 200);
  const aid = Number(autotanque_id);
  if (!Number.isFinite(aid)) return [];

  const { rows } = await db.query(
    `SELECT id::text AS id,
            unidad_db_id::text AS unidad_db_id,
            autotanque_id::text AS autotanque_id,
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
     WHERE autotanque_id = $1::bigint
       AND estado IN ('recibido','validando','cancelado')
     ORDER BY (estado = 'cancelado')::int ASC,
              litros_solicitados DESC NULLS LAST,
              created_at DESC,
              id DESC
     LIMIT $2`,
    [aid, lim]
  );

  return rows.map((r) => ({
    id: String(r.id),
    unidad_db_id: r.unidad_db_id != null ? String(r.unidad_db_id) : null,
    autotanque_id: r.autotanque_id != null ? String(r.autotanque_id) : null,
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

export async function avanzarPedidoEstadoAutotanque(args: {
  pedido_id: string;
  autotanque_id: string;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
}) {
  const pedidoId = Number(args.pedido_id);
  const atqId = Number(args.autotanque_id);
  if (!Number.isFinite(pedidoId) || !Number.isFinite(atqId)) {
    throw new Error("pedido_id o autotanque_id inválidos");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      estado: string;
      autotanque_id: string | null;
      telefono_origen: string;
    }>(
      `SELECT id::text AS id,
              estado::text AS estado,
              autotanque_id::text AS autotanque_id,
              telefono_origen::text AS telefono_origen
       FROM pedidos
       WHERE id = $1
       FOR UPDATE`,
      [pedidoId]
    );
    const p = rows[0];
    if (!p) throw new Error("pedido no encontrado");
    if (p.autotanque_id == null || p.autotanque_id === "") {
      await client.query(`UPDATE pedidos SET autotanque_id = $1 WHERE id = $2`, [
        atqId,
        pedidoId,
      ]);
    } else if (Number(p.autotanque_id) !== atqId) {
      throw new Error("pedido no pertenece al autotanque seleccionado");
    }

    const estadoActual = p.estado;
    let estadoNuevo: string;
    if (estadoActual === "recibido") {
      const { rows: conflictRows } = await client.query(
        `SELECT 1 AS ok
         FROM pedidos
         WHERE autotanque_id = $1::bigint
           AND estado = 'validando'
           AND id <> $2
         LIMIT 1
         FOR UPDATE`,
        [atqId, pedidoId]
      );
      if (conflictRows.length > 0) {
        throw Object.assign(new Error("Ya existe una solicitud en En proceso para esta unidad."), {
          status: 409,
        });
      }
      estadoNuevo = "validando";
    } else if (estadoActual === "validando") {
      estadoNuevo = "convertido_servicio";
    } else {
      throw Object.assign(
        new Error("Transición no permitida (solo recibidos->validando y validando->convertido_servicio)."),
        { status: 400 }
      );
    }

    await client.query(`UPDATE pedidos SET estado = $1 WHERE id = $2`, [
      estadoNuevo,
      pedidoId,
    ]);

    const nivelCarb = toFiniteNullableNumber(args.nivel_carburacion);
    const nivelAlm = toFiniteNullableNumber(args.nivel_almacen);

    await client.query(
      `INSERT INTO pedido_estado_historial (
         pedido_id, unidad_db_id, estado_anterior, estado_nuevo,
         nivel_carburacion, nivel_almacen
       )
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [pedidoId, estadoActual, estadoNuevo, nivelCarb, nivelAlm]
    );

    await client.query("COMMIT");
    return {
      pedido_id: String(pedidoId),
      estado_anterior: estadoActual,
      estado_nuevo: estadoNuevo,
      telefono_origen: String(p.telefono_origen),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelarPedidoAutotanque(args: {
  pedido_id: string;
  autotanque_id: string;
  razon_cancelacion: string;
  nivel_carburacion: number | null;
  nivel_almacen: number | null;
}) {
  const pedidoId = Number(args.pedido_id);
  const atqId = Number(args.autotanque_id);
  if (!Number.isFinite(pedidoId) || !Number.isFinite(atqId)) {
    throw new Error("pedido_id o autotanque_id inválidos");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      estado: string;
      autotanque_id: string | null;
    }>(
      `SELECT id::text AS id, estado::text AS estado, autotanque_id::text AS autotanque_id
       FROM pedidos
       WHERE id = $1
       FOR UPDATE`,
      [pedidoId]
    );
    const p = rows[0];
    if (!p) throw new Error("pedido no encontrado");
    if (p.autotanque_id == null || p.autotanque_id === "") {
      await client.query(`UPDATE pedidos SET autotanque_id = $1 WHERE id = $2`, [
        atqId,
        pedidoId,
      ]);
    } else if (Number(p.autotanque_id) !== atqId) {
      throw new Error("pedido no pertenece al autotanque seleccionado");
    }

    const estadoActual = p.estado;
    if (estadoActual === "cancelado" || estadoActual === "convertido_servicio") {
      throw Object.assign(new Error("No se puede cancelar este pedido."), { status: 400 });
    }
    if (estadoActual !== "recibido" && estadoActual !== "validando") {
      throw Object.assign(new Error("Transición no permitida (solo recibidos y validando)."), { status: 400 });
    }

    await client.query(`UPDATE pedidos SET estado = 'cancelado' WHERE id = $1`, [pedidoId]);

    const nivelCarb = toFiniteNullableNumber(args.nivel_carburacion);
    const nivelAlm = toFiniteNullableNumber(args.nivel_almacen);

    await client.query(
      `INSERT INTO pedido_estado_historial (
         pedido_id, unidad_db_id, estado_anterior, estado_nuevo,
         razon_cancelacion,
         nivel_carburacion, nivel_almacen
       )
       VALUES ($1, NULL, $2, $3, $4, $5, $6)`,
      [pedidoId, estadoActual, "cancelado", args.razon_cancelacion, nivelCarb, nivelAlm]
    );

    await client.query("COMMIT");
    return { pedido_id: String(pedidoId), estado_anterior: estadoActual, estado_nuevo: "cancelado" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

