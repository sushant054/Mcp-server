import { Router } from 'express';
import { MessageController } from '../controllers/messageController.js';

export function createMessageRoutes(controller: MessageController): Router {
  const router = Router();

  router.post('/message', (req, res) => controller.handleWhatsAppWebhook(req, res));
  router.get('/message', (req, res) => controller.handleWhatsAppVerification(req, res));
  router.post('/simple-message', (req, res) => controller.handleSimpleMessage(req, res));

  return router;
}