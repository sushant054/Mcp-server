import { Request, Response } from 'express';
import { UserSessionManager } from '../../mcp/services/models/userSession.js';
import { config } from '../../config/env.js';

export class HealthController {
  constructor(private sessionManager: UserSessionManager) {}

  getHealthStatus(req: Request, res: Response): void {
    res.json({ 
      status: 'OK', 
      message: 'MCP Client HTTP Server is running',
      timestamp: new Date().toISOString(),
      integratedNumber: config.msg91.whatsappIntegratedNumber,
      activeSessions: this.sessionManager.getSessionCount()
    });
  }
}