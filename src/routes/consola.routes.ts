import { Router } from "express";
import { requireApiKey } from "../middleware/requireApiKey";
import {
  getUnidadesConsola,
  getTelemetriaConsola,
  getEventosConsola,
  postInicioRuta,
} from "../controllers/consola.controller";

export const consolaRoutes = Router();

consolaRoutes.use(requireApiKey);

consolaRoutes.get("/unidades", getUnidadesConsola);
consolaRoutes.get("/telemetria/:clave", getTelemetriaConsola);
consolaRoutes.get("/eventos", getEventosConsola);
consolaRoutes.post("/inicio-ruta", postInicioRuta);
