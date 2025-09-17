import dotenv from 'dotenv';

dotenv.config();

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY
  },
  msg91: {
    apiKey: process.env.MSG91_API_KEY,
    whatsappIntegratedNumber: process.env.WHATSAPP_INTEGRATED_NUMBER || '15558428640'
  },
  webhook: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token'
  },
  server: {
    port: parseInt(process.env.PORT || '3020'),
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  }
};