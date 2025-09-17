export class HelpHandler {
  getHelpResponse(): string {
    return `I'd be happy to help you with tour details. To provide you with accurate information, please provide a valid Tour ID.

📋 *Tour ID Format*: 
* Should be a 36-character UUID format (e.g., 39d11c40-7dba-11f0-a387-8508a0009d76)
* You can find this in your booking confirmation or tour documents

💡 *Where to find your Tour ID*:
* Booking confirmation emails
* Tour management portal
* Your travel documents

Please reply with your Tour ID.`;
  }
}