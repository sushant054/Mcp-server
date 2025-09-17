export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserSession {
  phoneNumber: string;
  chatHistory: ChatHistoryItem[];
  lastInteraction: Date;
  currentTourId?: string;
  awaitingTourId: boolean;
  lastTourData?: any;
}

export interface WhatsAppMessage {
  text?: {
    body: string;
  };
  from?: string;
}

export interface WhatsAppContact {
  wa_id: string;
  profile?: {
    name?: string;
  };
}

export interface WhatsAppWebhookBody {
  messages: string;
  contacts: string;
  content?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface McpToolResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface TourQueryContext {
  userIdentifier: string;
  query: string;
  session: UserSession;
}

export interface WhatsAppWebhookResponse {
  message: string;
  recipientNumber: string;
  userName: string;
  messageId: string;
}