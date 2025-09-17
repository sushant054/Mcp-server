import { AnthropicService } from '../llm/anthropicService.js';

export class QueryAnalysisService {
  private anthropicService: AnthropicService;

  constructor(anthropicApiKey: string) {
    this.anthropicService = new AnthropicService(anthropicApiKey);
  }

  async analyzeQueryIntent(query: string, session: any): Promise<any> {
    const systemPrompt = `You are a query analyzer for a tour management system. 
    Analyze the user's query and return ONLY valid JSON in this exact format:
    
    {
      "intent": "greeting|tour_details|tracking|search|help|thanks|direct_tour_id|specific_question",
      "tourId": "tour ID if found or null",
      "confidence": 0.95,
      "toolToCall": "get-tour-details|get-tour-tracking|search-tours|null",
      "parameters": {"query": "search term if search intent"},
      "responseType": "direct|tool_call",
      "message": "brief explanation of analysis"
    }

    IMPORTANT: Return ONLY JSON, no other text, no markdown, no code blocks.

    Available tools: get-tour-details, get-tour-tracking, search-tours.

    Session context: currentTourId=${session.currentTourId || 'none'}, awaitingTourId=${session.awaitingTourId || false}

    Query analysis examples:
    - "hello" → {"intent": "greeting", "tourId": null, "confidence": 0.95, "toolToCall": null, "parameters": {}, "responseType": "direct", "message": "greeting detected"}
    - "tour abc-123" → {"intent": "tour_details", "tourId": "abc-123", "confidence": 0.98, "toolToCall": "get-tour-details", "parameters": {}, "responseType": "tool_call", "message": "tour details request with ID"}
    - "search VR tours" → {"intent": "search", "tourId": null, "confidence": 0.92, "toolToCall": "search-tours", "parameters": {"query": "VR"}, "responseType": "tool_call", "message": "search request for VR tours"}
    - "39d11c40-7dba-11f0-a387-8508a0009d76" → {"intent": "direct_tour_id", "tourId": "39d11c40-7dba-11f0-a387-8508a0009d76", "confidence": 0.99, "toolToCall": "get-tour-details", "parameters": {}, "responseType": "tool_call", "message": "direct tour ID provided"}`;

    try {
      return await this.anthropicService.analyzeQueryIntent(systemPrompt, query);
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      // Fallback to simple intent detection
      return this.fallbackIntentDetection(query, session);
    }
  }

  private fallbackIntentDetection(query: string, session: any): any {
    const lowerQuery = query.toLowerCase().trim();
    
    // Simple regex-based fallback
    const tourIdMatch = query.match(/([a-f0-9-]{36})/i);
    const tourId = tourIdMatch ? tourIdMatch[1] : null;

    if (tourId) {
      return {
        intent: "direct_tour_id",
        tourId: tourId,
        confidence: 0.9,
        toolToCall: "get-tour-details",
        parameters: {},
        responseType: "tool_call",
        message: "Tour ID detected in query"
      };
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return {
        intent: "greeting",
        tourId: null,
        confidence: 0.95,
        toolToCall: null,
        parameters: {},
        responseType: "direct",
        message: "Greeting detected"
      };
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
      const searchTerm = query.replace(/search|find|for|tours?/gi, '').trim();
      return {
        intent: "search",
        tourId: null,
        confidence: 0.85,
        toolToCall: "search-tours",
        parameters: { query: searchTerm || "tours" },
        responseType: "tool_call",
        message: "Search request detected"
      };
    }

    if (lowerQuery.includes('track') || lowerQuery.includes('status')) {
      return {
        intent: "tracking",
        tourId: session.currentTourId || null,
        confidence: 0.8,
        toolToCall: "get-tour-tracking",
        parameters: {},
        responseType: session.currentTourId ? "tool_call" : "direct",
        message: "Tracking request detected"
      };
    }

    if (lowerQuery.includes('details') || lowerQuery.includes('tour')) {
      return {
        intent: "tour_details",
        tourId: session.currentTourId || null,
        confidence: 0.8,
        toolToCall: session.currentTourId ? "get-tour-details" : null,
        parameters: {},
        responseType: session.currentTourId ? "tool_call" : "direct",
        message: "Tour details request detected"
      };
    }

    if (lowerQuery.includes('thank')) {
      return {
        intent: "thanks",
        tourId: null,
        confidence: 0.95,
        toolToCall: null,
        parameters: {},
        responseType: "direct",
        message: "Thanks detected"
      };
    }

    // Default to help
    return {
      intent: "help",
      tourId: null,
      confidence: 0.7,
      toolToCall: null,
      parameters: {},
      responseType: "direct",
      message: "Default to help response"
    };
  }

  async generateSmartResponse(query: string, session: any): Promise<string> {
    try {
      const systemPrompt = `You're a tour assistant. User query doesn't fit standard categories. 

      Session: tourId=${session.currentTourId || 'none'}

      Capabilities: search tours, get details by ID, track tours

      Query: ${query}

      Provide brief, helpful response or ask for clarification.`;

      return await this.anthropicService.createMessage({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{
          role: "user" as const,
          content: query
        }]
      });
    } catch (error) {
      console.error("LLM Error in generateSmartResponse:", error);
      return this.getDefaultResponse();
    }
  }

  private getDefaultResponse(): string {
    return `Available commands:
• "details [tour-id]" - Get tour details
• "search [keyword]" - Find tours  
• "track [tour-id]" - Tour tracking
• "help" - Show all options

Sample: details 39d11c40-7dba-11f0-a387-8508a0009d76`;
  }
}