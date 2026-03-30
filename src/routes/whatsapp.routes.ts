import { Router } from "express";
import { postWhatsAppTest } from "../controllers/whatsapp.controller";

export const whatsappRoutes = Router();

whatsappRoutes.post("/test", postWhatsAppTest);
