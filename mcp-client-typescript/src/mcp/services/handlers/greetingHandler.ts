export class GreetingHandler {
  handleGreeting(): string {
    return `Hello! I'm your tour assistant. I can help you:
* Get tour details by ID
* Search for tours
* Get tour tracking information

Examples:
* 'Get details for tour 39d11c40-7dba-11f0-a387-8508a0009d76'`;
  }

  handleThanks(): string {
    return "You're very welcome! 😊 I'm glad I could help with your tour management needs. If you need anything else related to tours, tracking, or bookings, don't hesitate to ask. Have a great day! 🚗✨";
  }
}