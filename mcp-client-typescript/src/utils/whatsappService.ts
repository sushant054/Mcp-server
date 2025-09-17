import axios from 'axios';
import { config } from '../config/env.js';
import { WhatsAppResponse } from '../types';

export class WhatsAppService {
  async sendMessage(message: string, recipientNumber: string): Promise<WhatsAppResponse> {
    try {
      if (!config.msg91.apiKey) {
        throw new Error('WhatsApp API key not configured in environment variables');
      }

      console.log(`📱 Sending WhatsApp to ${recipientNumber}: ${message.substring(0, 50)}...`);
      
      const requestData = {
        recipient_number: recipientNumber,
        text: message,
        content_type: "text",
        integrated_number: config.msg91.whatsappIntegratedNumber
      };

      const response = await axios.post(
        'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
        requestData,
        {
          headers: {
            'accept': 'application/json',
            'authkey': config.msg91.apiKey,
            'content-type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log(`✅ WhatsApp message sent successfully: ${response.data.messageId || 'N/A'}`);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('❌ WhatsApp API error:', error);
      const errorData = error instanceof Error ? error.message : 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        console.error('WhatsApp API response:', error.response?.data);
      }
      
      return { 
        success: false, 
        error: errorData
      };
    }
  }

// In WhatsAppService.ts - update the parseWebhookData method
parseWebhookData(body: any): { message: string; recipientNumber: string; userName: string; messageId: string } | null {
    try {
        console.log('📨 WhatsApp webhook received:', JSON.stringify(body, null, 2));
        
        const { messages, contacts, content } = body;
        
        if (!messages || !contacts) {
            console.error('Invalid webhook format: messages and contacts are required');
            return null;
        }

        let messagesArray, contactsArray;
        try {
            messagesArray = JSON.parse(messages);
            contactsArray = JSON.parse(contacts);
        } catch (parseError) {
            console.error('❌ Error parsing JSON:', parseError);
            return null;
        }
        
        if (messagesArray.length === 0) {
            console.error('No messages in webhook');
            return null;
        }

        const message = messagesArray[0];
        const contact = contactsArray[0];
        
        let userMessage = '';
        if (message.text && message.text.body) {
            userMessage = message.text.body;
        } else if (content) {
            try {
                const contentObj = JSON.parse(content);
                userMessage = contentObj.text || '';
            } catch (e) {
                userMessage = String(content);
            }
        } else if (typeof message === 'string') {
            userMessage = message;
        }
        
        const recipientNumber = message.from || contact.wa_id;
        const userName = contact.profile?.name || 'Unknown';
        const messageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(`💬 Message from ${userName} (${recipientNumber}): ${userMessage}`);
        
        if (!userMessage.trim()) {
            console.error('Empty message received');
            return null;
        }

        return {
            message: userMessage,
            recipientNumber,
            userName,
            messageId // ✅ ADD MESSAGE ID
        };
    } catch (error) {
        console.error('Error parsing webhook data:', error);
        return null;
    }
}
}