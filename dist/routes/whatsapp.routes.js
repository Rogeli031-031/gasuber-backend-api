"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappRoutes = void 0;
const express_1 = require("express");
const whatsapp_controller_1 = require("../controllers/whatsapp.controller");
exports.whatsappRoutes = (0, express_1.Router)();
exports.whatsappRoutes.post("/test", whatsapp_controller_1.postWhatsAppTest);
