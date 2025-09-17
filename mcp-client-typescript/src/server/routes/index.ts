import { Router } from 'express';
import { MessageController } from '../controllers/messageController.js';
import { HealthController } from '../controllers/healthController.js';
import { ChatHistoryController } from '../controllers/chatHistoryController.js';
import { createMessageRoutes } from './messageRoutes.js';
import { createHealthRoutes } from './healthRoutes.js';
import { createChatHistoryRoutes } from './chatHistoryRoutes.js';

export function createRoutes(
  messageController: MessageController,
  healthController: HealthController,
  chatHistoryController: ChatHistoryController
): Router {
  const router = Router();

  router.use('/api', createMessageRoutes(messageController));
  router.use('/api', createHealthRoutes(healthController));
  router.use('/api', createChatHistoryRoutes(chatHistoryController));

  return router;
}