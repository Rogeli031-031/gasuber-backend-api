import { db } from "../config/db";

export type PuestoTripulacionRow = {
  id: string;
  codigo: string;
};

export type EmpleadoTripulacionRow = {
  id: string;
  nombre_empleado: string;
  numero_empleado: string;
  puesto_id: string;
  puesto_codigo: string;
};

export type AsignacionTripulacionRow = {
  empleado_id: string;
  puesto_codigo: string;
  nombre_empleado: string;
  fecha_asignacion: string;
};

export async function listPuestosTripulacion(): Promise<PuestoTripulacionRow[]> {
  const { rows } = await db.query<{ id: string; codigo: string }>(
    `SELECT id::text, codigo FROM "ID-PUESTO-TRIPULACION" ORDER BY codigo ASC`
  );
  return rows;
}

/** Empleados de la planta y puesto; excluye los ya asignados a otro autotanque (no al actual). */
export async function listEmpleadosTripulacionDisponibles(params: {
  plantaId: string;
  puestoCodigo: "CHOFER" | "AYUDANTE";
  autotanqueIdExcluirActual: string | null;
}): Promise<EmpleadoTripulacionRow[]> {
  const { plantaId, puestoCodigo, autotanqueIdExcluirActual } = params;
  const { rows } = await db.query<{
    id: string;
    nombre_empleado: string;
    numero_empleado: string;
    puesto_id: string;
    puesto_codigo: string;
  }>(
    `SELECT e.id::text,
            e."NOMBRE DE EMPLEADO" AS nombre_empleado,
            e."NUMERO DE EMPLEADO" AS numero_empleado,
            e.puesto_id::text,
            p.codigo AS puesto_codigo
     FROM "ID-PDV-AUTOTANQUE-TRIPULACION" e
     JOIN "ID-PUESTO-TRIPULACION" p ON p.id = e.puesto_id
     WHERE e.planta_id = $1::bigint
       AND p.codigo = $2
       AND NOT EXISTS (
         SELECT 1
         FROM "ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION" a
         WHERE a.empleado_id = e.id
           AND (
             $3::bigint IS NULL
             OR a.autotanque_id IS DISTINCT FROM $3::bigint
           )
       )
     ORDER BY e."NOMBRE DE EMPLEADO" ASC`,
    [plantaId, puestoCodigo, autotanqueIdExcluirActual]
  );
  return rows;
}

export async function getAutotanquePlantaId(
  autotanqueId: string
): Promise<string | null> {
  const { rows } = await db.query<{ planta_id: string }>(
    `SELECT planta_id::text FROM "ID-PDV-AUTOTANQUE" WHERE id = $1::bigint LIMIT 1`,
    [autotanqueId]
  );
  return rows[0]?.planta_id ?? null;
}

export async function getAsignacionPorAutotanque(autotanqueId: string): Promise<{
  chofer: AsignacionTripulacionRow | null;
  ayudante: AsignacionTripulacionRow | null;
}> {
  const { rows } = await db.query<{
    empleado_id: string;
    puesto_codigo: string;
    nombre_empleado: string;
    fecha_asignacion: Date;
  }>(
    `SELECT a.empleado_id::text,
            p.codigo AS puesto_codigo,
            e."NOMBRE DE EMPLEADO" AS nombre_empleado,
            a.fecha_asignacion
     FROM "ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION" a
     JOIN "ID-PDV-AUTOTANQUE-TRIPULACION" e ON e.id = a.empleado_id
     JOIN "ID-PUESTO-TRIPULACION" p ON p.id = a.puesto_id
     WHERE a.autotanque_id = $1::bigint`,
    [autotanqueId]
  );

  let chofer: AsignacionTripulacionRow | null = null;
  let ayudante: AsignacionTripulacionRow | null = null;
  for (const r of rows) {
    const item: AsignacionTripulacionRow = {
      empleado_id: r.empleado_id,
      puesto_codigo: r.puesto_codigo,
      nombre_empleado: r.nombre_empleado,
      fecha_asignacion:
        r.fecha_asignacion instanceof Date
          ? r.fecha_asignacion.toISOString()
          : String(r.fecha_asignacion),
    };
    if (r.puesto_codigo === "CHOFER") chofer = item;
    if (r.puesto_codigo === "AYUDANTE") ayudante = item;
  }
  return { chofer, ayudante };
}

export async function guardarAsignacionTripulacion(params: {
  autotanqueId: string;
  choferEmpleadoId: string;
  ayudanteEmpleadoId: string;
}): Promise<{ fecha_asignacion: string }> {
  const { autotanqueId, choferEmpleadoId, ayudanteEmpleadoId } = params;

  if (choferEmpleadoId === ayudanteEmpleadoId) {
    throw Object.assign(new Error("Chofer y ayudante deben ser distintos"), {
      status: 400,
    });
  }

  const plantaAtq = await getAutotanquePlantaId(autotanqueId);
  if (!plantaAtq) {
    throw Object.assign(new Error("Autotanque no encontrado"), { status: 404 });
  }

  const client = await db.connect();
  const fecha = new Date();
  try {
    await client.query("BEGIN");

    const { rows: puestos } = await client.query<{ id: string; codigo: string }>(
      `SELECT id::text, codigo FROM "ID-PUESTO-TRIPULACION" WHERE codigo IN ('CHOFER','AYUDANTE')`
    );
    const idChofer = puestos.find((p) => p.codigo === "CHOFER")?.id;
    const idAyudante = puestos.find((p) => p.codigo === "AYUDANTE")?.id;
    if (!idChofer || !idAyudante) {
      throw new Error("Puestos CHOFER/AYUDANTE no configurados");
    }

    const { rows: empRows } = await client.query<{
      id: string;
      planta_id: string;
      puesto_id: string;
    }>(
      `SELECT id::text, planta_id::text, puesto_id::text
       FROM "ID-PDV-AUTOTANQUE-TRIPULACION"
       WHERE id IN ($1::bigint, $2::bigint)`,
      [choferEmpleadoId, ayudanteEmpleadoId]
    );
    if (empRows.length !== 2) {
      throw Object.assign(new Error("Empleado no encontrado"), { status: 400 });
    }
    const eCh = empRows.find((e) => e.id === choferEmpleadoId);
    const eAy = empRows.find((e) => e.id === ayudanteEmpleadoId);
    if (!eCh || !eAy) {
      throw Object.assign(new Error("Empleado no encontrado"), { status: 400 });
    }
    if (eCh.planta_id !== plantaAtq || eAy.planta_id !== plantaAtq) {
      throw Object.assign(
        new Error("Los empleados deben ser de la misma planta que el autotanque"),
        { status: 400 }
      );
    }
    if (eCh.puesto_id !== idChofer) {
      throw Object.assign(
        new Error("El primer empleado debe tener puesto CHOFER en el catálogo"),
        { status: 400 }
      );
    }
    if (eAy.puesto_id !== idAyudante) {
      throw Object.assign(
        new Error("El segundo empleado debe tener puesto AYUDANTE en el catálogo"),
        { status: 400 }
      );
    }

    await client.query(
      `DELETE FROM "ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION"
       WHERE autotanque_id = $1::bigint
          OR empleado_id IN ($2::bigint, $3::bigint)`,
      [autotanqueId, choferEmpleadoId, ayudanteEmpleadoId]
    );

    await client.query(
      `INSERT INTO "ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION"
        (autotanque_id, empleado_id, puesto_id, fecha_asignacion)
       VALUES ($1::bigint, $2::bigint, $3::smallint, $4::timestamptz)`,
      [autotanqueId, choferEmpleadoId, parseInt(idChofer, 10), fecha]
    );
    await client.query(
      `INSERT INTO "ID-PDV-AUTOTANQUE-TRIPULACION-ASIGNACION"
        (autotanque_id, empleado_id, puesto_id, fecha_asignacion)
       VALUES ($1::bigint, $2::bigint, $3::smallint, $4::timestamptz)`,
      [autotanqueId, ayudanteEmpleadoId, parseInt(idAyudante, 10), fecha]
    );

    await client.query("COMMIT");
    return { fecha_asignacion: fecha.toISOString() };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
