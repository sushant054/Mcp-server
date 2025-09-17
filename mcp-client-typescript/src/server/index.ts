import express from 'express';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { McpService } from '../mcp/services/mcpService.js';
import { UserSessionManager } from '../mcp/services/models/userSession.js';
import { WhatsAppService } from '../utils/whatsappService.js';
import { MessageController } from './controllers/messageController.js';
import { HealthController } from './controllers/healthController.js';
import { ChatHistoryController } from './controllers/chatHistoryController.js';
import { config } from '../config/env.js';

export class HttpServer {
  private app: express.Application;
  private server: any;

  constructor(
    private mcpService: McpService,
    private sessionManager: UserSessionManager,
    private whatsappService: WhatsAppService
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    const messageController = new MessageController(
      this.mcpService,
      this.sessionManager,
      this.whatsappService
    );
    
    const healthController = new HealthController(this.sessionManager);
    const chatHistoryController = new ChatHistoryController(this.sessionManager);
    
    const routes = createRoutes(
      messageController,
      healthController,
      chatHistoryController
    );
    
    this.app.use(routes);
  }

  start(port = config.server.port): void {
    this.server = this.app.listen(port, () => {
      console.log(`🌐 HTTP Server running on port ${port}`);
      console.log(`📋 Endpoints:`);
      console.log(`   GET  http://localhost:${port}/api/health`);
      console.log(`   POST http://localhost:${port}/api/message (WhatsApp webhook)`);
      console.log(`   POST http://localhost:${port}/api/simple-message (Simple API)`);
      console.log(`   GET  http://localhost:${port}/api/chat-history/:phoneNumber (Debug)`);
      console.log(`   Integrated Number: ${config.msg91.whatsappIntegratedNumber}`);
    });
  }

  close(): void {
    if (this.server) {
      this.server.close();
      console.log("✅ HTTP server closed");
    }
  }
}