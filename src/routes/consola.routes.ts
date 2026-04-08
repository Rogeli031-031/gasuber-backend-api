import { Router } from "express";
import { requireApiKey } from "../middleware/requireApiKey";
import {
  getUnidadesConsola,
  getPlantasConsola,
  getPdvConsola,
  getPdvEstacionConsola,
  getPdvAlmacenConsola,
  getPdvAutotanqueConsola,
  getTarjetasConsola,
  patchActivoTarjetaConsola,
  getTripulacionPuestosConsola,
  getTripulacionEmpleadosConsola,
  getTripulacionAsignacionConsola,
  postTripulacionAsignacionConsola,
  getTelemetriaConsola,
  getEventosConsola,
  getPedidosConsola,
  postPedidoAvanzarConsola,
  postPedidoCancelarConsola,
  postPedidoConsola,
  postInicioRuta,
} from "../controllers/consola.controller";

export const consolaRoutes = Router();

consolaRoutes.use(requireApiKey);

consolaRoutes.get("/unidades", getUnidadesConsola);
consolaRoutes.get("/plantas", getPlantasConsola);
consolaRoutes.get("/pdv", getPdvConsola);
consolaRoutes.get("/pdv-estacion", getPdvEstacionConsola);
consolaRoutes.get("/pdv-almacen", getPdvAlmacenConsola);
consolaRoutes.get("/pdv-autotanque", getPdvAutotanqueConsola);
consolaRoutes.get("/tarjetas", getTarjetasConsola);
consolaRoutes.patch("/activo-tarjeta", patchActivoTarjetaConsola);
consolaRoutes.get("/tripulacion/puestos", getTripulacionPuestosConsola);
consolaRoutes.get("/tripulacion/empleados", getTripulacionEmpleadosConsola);
consolaRoutes.get("/tripulacion/asignacion", getTripulacionAsignacionConsola);
consolaRoutes.post("/tripulacion/asignacion", postTripulacionAsignacionConsola);
consolaRoutes.get("/telemetria/:clave", getTelemetriaConsola);
consolaRoutes.get("/eventos", getEventosConsola);
consolaRoutes.get("/pedidos", getPedidosConsola);
consolaRoutes.post("/pedidos", postPedidoConsola);
consolaRoutes.post("/pedidos/:id/avanzar", postPedidoAvanzarConsola);
consolaRoutes.post("/pedidos/:id/cancelar", postPedidoCancelarConsola);
consolaRoutes.post("/inicio-ruta", postInicioRuta);
