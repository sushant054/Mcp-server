import { UserSession, ChatHistoryItem } from '../../../types';
import { config } from '../../../config/env.js';

export class UserSessionManager {
  private userSessions: Map<string, UserSession> = new Map();

  constructor() {
    // Cleanup old sessions every session timeout period
    setInterval(() => this.cleanupOldSessions(), config.server.sessionTimeout);
  }

  getUserSession(phoneNumber: string): UserSession {
    if (!this.userSessions.has(phoneNumber)) {
      this.userSessions.set(phoneNumber, {
        phoneNumber,
        chatHistory: [],
        lastInteraction: new Date(),
        awaitingTourId: false
      });
    }
    
    const session = this.userSessions.get(phoneNumber)!;
    session.lastInteraction = new Date();
    return session;
  }

  addToChatHistory(phoneNumber: string, role: 'user' | 'assistant', content: string): void {
    const session = this.getUserSession(phoneNumber);
    session.chatHistory.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages
    if (session.chatHistory.length > 20) {
      session.chatHistory = session.chatHistory.slice(-20);
    }
  }

  getSessionCount(): number {
    return this.userSessions.size;
  }

  getSessionByPhoneNumber(phoneNumber: string): UserSession | undefined {
    return this.userSessions.get(phoneNumber);
  }

  private cleanupOldSessions(): void {
    const now = new Date();
    for (const [phoneNumber, session] of this.userSessions.entries()) {
      if (now.getTime() - session.lastInteraction.getTime() > config.server.sessionTimeout) {
        this.userSessions.delete(phoneNumber);
        console.log(`Cleaned up session for ${phoneNumber}`);
      }
    }
  }
}