import { Request, Response } from 'express';
import { UserSessionManager } from '../../mcp/services/models/userSession.js';

export class ChatHistoryController {
  constructor(private sessionManager: UserSessionManager) {}

  getChatHistory(req: Request, res: Response): void {
    const { phoneNumber } = req.params;
    const session = this.sessionManager.getSessionByPhoneNumber(phoneNumber);
    
    if (!session) {
      res.status(404).json({ error: 'No chat history found for this number' });
      return;
    }
    
    res.json({
      phoneNumber,
      chatHistory: session.chatHistory,
      lastInteraction: session.lastInteraction,
      currentTourId: session.currentTourId,
      awaitingTourId: session.awaitingTourId
    });
  }
}