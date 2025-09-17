import { Request, Response } from 'express';
import { McpService } from '../../mcp/services/mcpService.js';
import { UserSessionManager } from '../../mcp/services/models/userSession.js';
import { WhatsAppService } from '../../utils/whatsappService.js';
import { config } from '../../config/env.js';

export class MessageController {
  private processedMessages: Set<string> = new Set();
  private recentMessages: Map<string, number> = new Map();
  private static cleanupInitialized = false;

  constructor(
    private mcpService: McpService,
    private sessionManager: UserSessionManager,
    private whatsappService: WhatsAppService
  ) {
    // ✅ INITIALIZE CLEANUP ON FIRST INSTANCE CREATION
    if (!MessageController.cleanupInitialized) {
      MessageController.cleanupInitialized = true;
      this.cleanupOldMessages();
    }
  }

  async handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = this.whatsappService.parseWebhookData(req.body);
      
      if (!webhookData) {
        res.status(400).json({ error: 'Invalid webhook data' });
        return;
      }

      // ✅ ADD DUPLICATE DETECTION
      const messageId = webhookData.messageId || `msg-${Date.now()}`;
      if (this.processedMessages.has(messageId)) {
        console.log('⚠️ Duplicate message detected, skipping:', messageId);
        res.status(200).json({ success: true, duplicate: true });
        return;
      }
      this.processedMessages.add(messageId);

      // Clean up old processed messages (keep last 1000)
      if (this.processedMessages.size > 1000) {
        const array = Array.from(this.processedMessages);
        this.processedMessages = new Set(array.slice(-500));
      }

      const { message: userMessage, recipientNumber, userName } = webhookData;

      this.sessionManager.addToChatHistory(recipientNumber, 'user', userMessage);
      const mcpResponse = await this.mcpService.processQuery(userMessage, recipientNumber);
      this.sessionManager.addToChatHistory(recipientNumber, 'assistant', mcpResponse);

      if (config.msg91.apiKey && recipientNumber) {
        // ✅ ADD DEBOUNCING FOR WHATSAPP MESSAGES
        const now = Date.now();
        const messageKey = `${recipientNumber}-${mcpResponse.substring(0, 50)}`;
        
        if (this.recentMessages.has(messageKey)) {
          const lastSent = this.recentMessages.get(messageKey)!;
          if (now - lastSent < 3000) { // 3 second debounce
            console.log('⏸️ Debouncing duplicate WhatsApp message');
            res.status(200).json({ success: true, debounced: true });
            return;
          }
        }
        
        this.recentMessages.set(messageKey, now);
        
        // Clean up old recent messages
        if (this.recentMessages.size > 500) {
          const now = Date.now();
          for (const [key, timestamp] of this.recentMessages.entries()) {
            if (now - timestamp > 30000) { // 30 seconds old
              this.recentMessages.delete(key);
            }
          }
        }

        await this.whatsappService.sendMessage(mcpResponse, recipientNumber);
      }

      res.status(200).json({
        success: true,
        processed: true,
        recipient: recipientNumber,
        userName: userName,
        response: mcpResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('❌ Error processing WhatsApp webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleSimpleMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, recipientNumber } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      console.log(`💬 Received simple message: ${message}`);
      
      if (recipientNumber) {
        this.sessionManager.addToChatHistory(recipientNumber, 'user', message);
      }
      
      const mcpResponse = await this.mcpService.processQuery(message, recipientNumber || 'test-user');
      
      if (recipientNumber) {
        this.sessionManager.addToChatHistory(recipientNumber, 'assistant', mcpResponse);
      }
      
      let whatsappResult = null;
      if (recipientNumber && config.msg91.apiKey) {
        // ✅ ADD DEBOUNCING FOR SIMPLE MESSAGES TOO
        const now = Date.now();
        const messageKey = `${recipientNumber}-${mcpResponse.substring(0, 50)}`;
        
        if (this.recentMessages.has(messageKey)) {
          const lastSent = this.recentMessages.get(messageKey)!;
          if (now - lastSent < 3000) {
            console.log('⏸️ Debouncing duplicate simple message');
            whatsappResult = { success: true, debounced: true };
          }
        } else {
          this.recentMessages.set(messageKey, now);
          whatsappResult = await this.whatsappService.sendMessage(mcpResponse, recipientNumber);
        }
      }

      res.json({
        success: true,
        mcpResponse: mcpResponse,
        whatsapp: whatsappResult,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Error processing simple message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleWhatsAppVerification(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`🔐 Webhook verification attempt: mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === config.webhook.verifyToken) {
      console.log('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  }

  // ✅ ADD METHOD TO CLEANUP OLD MESSAGES PERIODICALLY
  private cleanupOldMessages(): void {
    const now = Date.now();
    
    // Clean recent messages older than 30 seconds
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > 30000) {
        this.recentMessages.delete(key);
      }
    }
    
    // Clean processed messages if too large
    if (this.processedMessages.size > 1000) {
      const array = Array.from(this.processedMessages);
      this.processedMessages = new Set(array.slice(-500));
    }
    
    // Run cleanup every minute
    setTimeout(() => this.cleanupOldMessages(), 60000);
  }
}