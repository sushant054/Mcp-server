import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

export function createHealthRoutes(controller: HealthController): Router {
  const router = Router();

  router.get('/health', (req, res) => controller.getHealthStatus(req, res));

  return router;
}