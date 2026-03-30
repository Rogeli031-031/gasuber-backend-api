import { Router } from "express";
import {
  getWhatsAppWebhook,
  postWhatsAppTest,
  postWhatsAppWebhook,
} from "../controllers/whatsapp.controller";

export const whatsappRoutes = Router();

whatsappRoutes.get("/webhook", getWhatsAppWebhook);
whatsappRoutes.post("/webhook", postWhatsAppWebhook);
whatsappRoutes.post("/test", postWhatsAppTest);
