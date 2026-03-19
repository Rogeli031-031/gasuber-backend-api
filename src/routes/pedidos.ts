import { Router } from "express";
import { db } from "../config/db";

export const pedidosRouter = Router();

pedidosRouter.get("/", async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, telefono_origen, cliente_nombre, direccion_texto, litros_solicitados, estado, prioridad, created_at
     FROM pedidos
     ORDER BY created_at DESC
     LIMIT 50`
  );
  res.json({ ok: true, items: rows });
});

pedidosRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, error: "id inválido" });
  }

  const { rows } = await db.query(
    `SELECT id, telefono_origen, cliente_nombre, direccion_texto, litros_solicitados, estado, prioridad, created_at
     FROM pedidos
     WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ ok: false, error: "pedido no encontrado" });
  }

  return res.json({ ok: true, item: rows[0] });
});

pedidosRouter.post("/", async (req, res) => {
  const {
    telefono_origen,
    cliente_nombre = null,
    direccion_texto,
    litros_solicitados = null,
    prioridad = 3,
  } = req.body ?? {};

  if (!telefono_origen || typeof telefono_origen !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "telefono_origen es requerido" });
  }

  if (!direccion_texto || typeof direccion_texto !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "direccion_texto es requerido" });
  }

  const prioridadNum = Number(prioridad);
  if (!Number.isFinite(prioridadNum) || prioridadNum < 1 || prioridadNum > 5) {
    return res.status(400).json({ ok: false, error: "prioridad inválida" });
  }

  const litrosNum =
    litros_solicitados === null || litros_solicitados === undefined
      ? null
      : Number(litros_solicitados);
  if (litrosNum !== null && (!Number.isFinite(litrosNum) || litrosNum <= 0)) {
    return res
      .status(400)
      .json({ ok: false, error: "litros_solicitados inválido" });
  }

  const { rows } = await db.query(
    `INSERT INTO pedidos (telefono_origen, cliente_nombre, direccion_texto, litros_solicitados, prioridad)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, telefono_origen, cliente_nombre, direccion_texto, litros_solicitados, estado, prioridad, created_at`,
    [
      telefono_origen,
      cliente_nombre,
      direccion_texto,
      litrosNum,
      prioridadNum,
    ]
  );

  return res.status(201).json({ ok: true, item: rows[0] });
});

