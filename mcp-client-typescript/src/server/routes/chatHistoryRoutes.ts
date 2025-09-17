import { Router } from 'express';
import { ChatHistoryController } from '../controllers/chatHistoryController.js';

export function createChatHistoryRoutes(controller: ChatHistoryController): Router {
  const router = Router();

  router.get('/chat-history/:phoneNumber', (req, res) => controller.getChatHistory(req, res));

  return router;
}