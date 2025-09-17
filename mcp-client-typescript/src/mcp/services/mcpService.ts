// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// import { UserSessionManager } from '../models/userSession.js';
// import { TourParser } from '../utils/tourParser.js';
// import { TourQueryContext, McpToolResult } from '../types';
// import Anthropic from '@anthropic-ai/sdk';

// export class McpService {
//   private mcp: Client;
//   private transport: StdioClientTransport | null = null;
//   private tools: any[] = [];
//   private sessionManager: UserSessionManager;
//   private anthropic: Anthropic;

//   constructor(sessionManager: UserSessionManager, anthropicApiKey: string) {
//     this.mcp = new Client({ 
//       name: "tour-client", 
//       version: "1.0.0" 
//     });
//     this.sessionManager = sessionManager;
//     this.anthropic = new Anthropic({
//       apiKey: anthropicApiKey
//     });
//   }

//   async connectToServer(serverPath: string): Promise<void> {
//     try {
//       this.transport = new StdioClientTransport({
//         command: 'node',
//         args: [serverPath],
//       });
      
//       await this.mcp.connect(this.transport);

//       const toolsResult = await this.mcp.listTools();
//       this.tools = toolsResult.tools;
      
//       console.log(
//         "✅ Connected to server with tools:",
//         this.tools.map((t: any) => t.name)
//       );

//     } catch (error: unknown) {
//       console.error("❌ Failed to connect to MCP server:", error);
//       throw error;
//     }
//   }

// async processQuery(query: string, userIdentifier: string = 'default-user'): Promise<string> {
//   const session = this.sessionManager.getUserSession(userIdentifier);
  
//   try {
//     const intent = await this.analyzeQueryIntent(query, session);
    
//     // If LLM failed but we have a fallback, use it
//     if (intent.responseType === "direct" && intent.intent === "help") {
//       return this.getHelpResponse();
//     }
    
//     return await this.handleQueryBasedOnIntent(intent, { userIdentifier, query, session });
    
//   } catch (error: unknown) {
//     console.error("Error processing query:", error);
    
//     // Try direct tour ID extraction as last resort
//     const tourId = TourParser.extractTourId(query);
//     if (tourId) {
//       return await this.handleDirectTourId(tourId, { userIdentifier, query, session });
//     }
    
//     return "I'm having trouble understanding your request. Please try rephrasing or say 'help' for options.";
//   }
// }

//  private async analyzeQueryIntent(query: string, session: any): Promise<any> {
//   const systemPrompt = `You are a query analyzer for a tour management system. 
//   Analyze the user's query and return ONLY valid JSON in this exact format:
  
//   {
//     "intent": "greeting|tour_details|tracking|search|help|thanks|direct_tour_id|specific_question",
//     "tourId": "tour ID if found or null",
//     "confidence": 0.95,
//     "toolToCall": "get-tour-details|get-tour-tracking|search-tours|null",
//     "parameters": {"query": "search term if search intent"},
//     "responseType": "direct|tool_call",
//     "message": "brief explanation of analysis"
//   }

//   IMPORTANT: Return ONLY JSON, no other text, no markdown, no code blocks.

//   Available tools: get-tour-details, get-tour-tracking, search-tours.

//   Session context: currentTourId=${session.currentTourId || 'none'}, awaitingTourId=${session.awaitingTourId || false}

//   Query analysis examples:
//   - "hello" → {"intent": "greeting", "tourId": null, "confidence": 0.95, "toolToCall": null, "parameters": {}, "responseType": "direct", "message": "greeting detected"}
//   - "tour abc-123" → {"intent": "tour_details", "tourId": "abc-123", "confidence": 0.98, "toolToCall": "get-tour-details", "parameters": {}, "responseType": "tool_call", "message": "tour details request with ID"}
//   - "search VR tours" → {"intent": "search", "tourId": null, "confidence": 0.92, "toolToCall": "search-tours", "parameters": {"query": "VR"}, "responseType": "tool_call", "message": "search request for VR tours"}
//   - "39d11c40-7dba-11f0-a387-8508a0009d76" → {"intent": "direct_tour_id", "tourId": "39d11c40-7dba-11f0-a387-8508a0009d76", "confidence": 0.99, "toolToCall": "get-tour-details", "parameters": {}, "responseType": "tool_call", "message": "direct tour ID provided"}`;

//   try {
//     const response = await this.anthropic.messages.create({
//       model: "claude-3-5-haiku-20241022",
//       max_tokens: 500,
//       temperature: 0.1, // Lower temperature for more consistent JSON
//       system: systemPrompt,
//       messages: [{
//         role: "user",
//         content: query
//       }]
//     });

//     const content = response.content[0];
//     if (content.type === 'text') {
//       // Extract JSON from response (in case LLM adds extra text)
//       const jsonMatch = content.text.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         return JSON.parse(jsonMatch[0]);
//       }
//       return JSON.parse(content.text);
//     }
//     throw new Error("No text response from LLM");
//   } catch (parseError) {
//     console.error("Error parsing LLM response:", parseError);
//     // Fallback to simple intent detection
//     return this.fallbackIntentDetection(query, session);
//   }
// }

// private fallbackIntentDetection(query: string, session: any): any {
//   const lowerQuery = query.toLowerCase().trim();
  
//   // Simple regex-based fallback
//   const tourIdMatch = query.match(/([a-f0-9-]{36})/i);
//   const tourId = tourIdMatch ? tourIdMatch[1] : null;

//   if (tourId) {
//     return {
//       intent: "direct_tour_id",
//       tourId: tourId,
//       confidence: 0.9,
//       toolToCall: "get-tour-details",
//       parameters: {},
//       responseType: "tool_call",
//       message: "Tour ID detected in query"
//     };
//   }

//   if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
//     return {
//       intent: "greeting",
//       tourId: null,
//       confidence: 0.95,
//       toolToCall: null,
//       parameters: {},
//       responseType: "direct",
//       message: "Greeting detected"
//     };
//   }

//   if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
//     const searchTerm = query.replace(/search|find|for|tours?/gi, '').trim();
//     return {
//       intent: "search",
//       tourId: null,
//       confidence: 0.85,
//       toolToCall: "search-tours",
//       parameters: { query: searchTerm || "tours" },
//       responseType: "tool_call",
//       message: "Search request detected"
//     };
//   }

//   if (lowerQuery.includes('track') || lowerQuery.includes('status')) {
//     return {
//       intent: "tracking",
//       tourId: session.currentTourId || null,
//       confidence: 0.8,
//       toolToCall: "get-tour-tracking",
//       parameters: {},
//       responseType: session.currentTourId ? "tool_call" : "direct",
//       message: "Tracking request detected"
//     };
//   }

//   if (lowerQuery.includes('details') || lowerQuery.includes('tour')) {
//     return {
//       intent: "tour_details",
//       tourId: session.currentTourId || null,
//       confidence: 0.8,
//       toolToCall: session.currentTourId ? "get-tour-details" : null,
//       parameters: {},
//       responseType: session.currentTourId ? "tool_call" : "direct",
//       message: "Tour details request detected"
//     };
//   }

//   if (lowerQuery.includes('thank')) {
//     return {
//       intent: "thanks",
//       tourId: null,
//       confidence: 0.95,
//       toolToCall: null,
//       parameters: {},
//       responseType: "direct",
//       message: "Thanks detected"
//     };
//   }

//   // Default to help
//   return {
//     intent: "help",
//     tourId: null,
//     confidence: 0.7,
//     toolToCall: null,
//     parameters: {},
//     responseType: "direct",
//     message: "Default to help response"
//   };
// }

//   private async handleQueryBasedOnIntent(intent: any, context: TourQueryContext): Promise<string> {
//     const { session, query } = context;

//     switch (intent.intent) {
//       case 'greeting':
//        return `Hello! I'm your tour assistant. I can help you:
// * Get tour details by ID
// * Search for tours
// * Get tour tracking information

// Examples:
// * 'Get details for tour 39d11c40-7dba-11f0-a387-8508a0009d76'`;
            
//       case 'thanks':
//         return "You're very welcome! 😊 I'm glad I could help with your tour management needs. If you need anything else related to tours, tracking, or bookings, don't hesitate to ask. Have a great day! 🚗✨";
        
//       case 'help':
//         return this.getHelpResponse();
        
//       case 'tour_details':
//       case 'specific_question':
//         return await this.handleTourDetailsRequest(intent, context);
        
//       case 'tracking':
//         return await this.handleTrackingRequest(intent, context);
        
//       case 'search':
//         return await this.handleSearchRequest(intent, context);
        
//       case 'direct_tour_id':
//         return await this.handleDirectTourId(intent.tourId, context);
        
//       default:
//         return await this.generateSmartResponse(query, session);
//     }
//   }

//   private async handleTourDetailsRequest(intent: any, context: TourQueryContext): Promise<string> {
//     const { session } = context;
    
//     let tourId = intent.tourId;
    
    
    
//     if (!tourId && session.currentTourId) {
//       tourId = session.currentTourId;

//       return `I see we were previously discussing tour ${session.currentTourId}. Would you like details for this same tour, or do you have a different tour ID?`;
//     }
    
    
//     if (!tourId) {
//       session.awaitingTourId = true;
//       return "Need a tour ID. Example: 39d11c40-7dba-11f0-a387-8508a0009d76";
//     }
    
//     session.currentTourId = tourId;
//     session.awaitingTourId = false;
    
//     try {
//       console.log("🔧 Getting tour details for:", tourId);
//       const result = await this.mcp.callTool({
//         name: "get-tour-details",
//         arguments: { tourId }
//       });
      
//       const tourData = this.extractTextFromResult(result);
//       session.lastTourData = tourData;
      
//       if (intent.intent === 'specific_question') {
//         return await this.extractSpecificInformation(tourData, context.query);
//       }
      
//       return await this.formatTourDetailsResponse(tourData, context.query);
      
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return `Error getting tour details: ${errorMessage}`;
//     }
//   }

//   private async handleTrackingRequest(intent: any, context: TourQueryContext): Promise<string> {
//     const { session, query } = context;
    
//     let tourId = intent.tourId || session.currentTourId;
    
//     if (!tourId) {
//       session.awaitingTourId = true;
//       return "Need a tour ID for tracking. Example: track tour 39d11c40-7dba-11f0-a387-8508a0009d76";
//     }
    
//     const guestIdMatch = query.match(/guest[:\s]+([a-f0-9-]{36})/i);
//     const guestId = guestIdMatch ? guestIdMatch[1] : undefined;
    
//     try {
//       console.log("🔧 Getting tour tracking for:", tourId, guestId ? `(guest: ${guestId})` : '');
//       const result = await this.mcp.callTool({
//         name: "get-tour-tracking",
//         arguments: { tourId, guestId }
//       });
      
//       const trackingData = this.extractTextFromResult(result);
//       return await this.formatTrackingResponse(trackingData, query);
      
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return `Error getting tracking: ${errorMessage}`;
//     }
//   }

//   private async handleSearchRequest(intent: any, context: TourQueryContext): Promise<string> {
//     const { query } = context;
    
//     let searchQuery = intent.parameters?.query;
//     if (!searchQuery) {
//       searchQuery = query.replace(/search|for|find|tour|tours/gi, '').trim() || "VR";
//     }
    
//     try {
//       console.log("🔧 Searching tours for:", searchQuery);
//       const result = await this.mcp.callTool({
//         name: "search-tours",
//         arguments: { query: searchQuery, maxResults: 10 }
//       });
      
//       const searchResults = this.extractTextFromResult(result);
//       return await this.formatSearchResponse(searchResults, query);
      
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return `Search error: ${errorMessage}`;
//     }
//   }

//   private async handleDirectTourId(tourId: string, context: TourQueryContext): Promise<string> {
//     context.session.currentTourId = tourId;
//     context.session.awaitingTourId = false;
    
//     try {
//       console.log("🔧 Getting tour details for:", tourId);
//       const result = await this.mcp.callTool({
//         name: "get-tour-details",
//         arguments: { tourId }
//       });
      
//       const tourData = this.extractTextFromResult(result);
//       context.session.lastTourData = tourData;
      
//       return await this.formatTourDetailsResponse(tourData, context.query);
      
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return `Error: ${errorMessage}`;
//     }
//   }

//   private getHelpResponse(): string {
//     return `I'd be happy to help you with tour details. To provide you with accurate information, please provide a valid Tour ID.

// 📋 *Tour ID Format*: 
// * Should be a 36-character UUID format (e.g., 39d11c40-7dba-11f0-a387-8508a0009d76)
// * You can find this in your booking confirmation or tour documents

// 💡 *Where to find your Tour ID*:
// * Booking confirmation emails
// * Tour management portal
// * Your travel documents

// Please reply with your Tour ID.`;
//   }

// private async extractSpecificInformation(tourData: string, query: string): Promise<string> {
//   try {
//     // Delegate to your existing TourParser
//     const result = TourParser.extractSpecificTourInfo(tourData, query);
    
//     // If the parser returned the full data (meaning it couldn't extract specific info),
//     // use LLM as a fallback
//     if (result.length > 500 || result === tourData) {
//       return await this.llmExtractSpecificInfoFallback(tourData, query);
//     }
    
//     return result;
    
//   } catch (error) {
//     console.error('Error extracting specific info:', error);
//     return await this.llmExtractSpecificInfoFallback(tourData, query);
//   }
// }

// private async llmExtractSpecificInfoFallback(tourData: string, query: string): Promise<string> {
//   const systemPrompt = `Extract ONLY the specific information requested from the tour data. 
//   Be concise and direct. Do not include the full tour details unless specifically asked.

//   Query: ${query}
  
//   Return ONLY the answer, no additional text.`;

//   try {
//     const response = await this.anthropic.messages.create({
//       model: "claude-3-5-haiku-20241022",
//       max_tokens: 200,
//       temperature: 0.1,
//       system: systemPrompt,
//       messages: [{
//         role: "user",
//         content: `Tour Data: ${tourData}\n\nExtract the information requested in the query.`
//       }]
//     });

//     const content = response.content[0];
//     return content.type === 'text' ? content.text : "Information not available.";
//   } catch (error) {
//     return "I couldn't extract the specific information you requested from the tour data.";
//   }
// }

//   private async formatTourDetailsResponse(tourData: string, query: string): Promise<string> {
//     const systemPrompt = `Format tour data concisely. Include key details: tour ID, client, dates, status, guests. Keep it brief and organized.

// Tour data: ${tourData}
// Query: ${query}`;

//     const response = await this.anthropic.messages.create({
//       model: "claude-3-5-haiku-20241022",
//       max_tokens: 800,
//       system: systemPrompt,
//       messages: [{
//         role: "user", 
//         content: "Format tour information briefly."
//       }]
//     });

//     const content = response.content[0];
//     return content.type === 'text' ? content.text : tourData;
//   }

//   private async formatTrackingResponse(trackingData: string, query: string): Promise<string> {
//     const systemPrompt = `Format tracking data briefly. Focus on: current status, guest locations, pickup/drop status, driver info. Keep concise.

// Tracking data: ${trackingData}
// Query: ${query}`;

//     const response = await this.anthropic.messages.create({
//       model: "claude-3-5-haiku-20241022", 
//       max_tokens: 600,
//       system: systemPrompt,
//       messages: [{
//         role: "user",
//         content: "Format tracking information briefly."
//       }]
//     });

//     const content = response.content[0];
//     return content.type === 'text' ? content.text : trackingData;
//   }

//   private async formatSearchResponse(searchResults: string, query: string): Promise<string> {
//     try {
//       const systemPrompt = `Format search results briefly. Show: number found, key details per tour (ID, client, date), keep it scannable.

// Search results: ${searchResults}
// Query: ${query}`;

//       const response = await this.anthropic.messages.create({
//         model: "claude-3-5-haiku-20241022",
//         max_tokens: 700, 
//         system: systemPrompt,
//         messages: [{
//           role: "user",
//           content: "Format search results briefly."
//         }]
//       });

//       const content = response.content[0];
//       return content.type === 'text' ? content.text : searchResults;
//     } catch (error) {
//       console.error("LLM Error in formatSearchResponse:", error);
//       return `Search Results:\n${searchResults}`;
//     }
//   }

//   private async generateSmartResponse(query: string, session: any): Promise<string> {
//     try {
//       const systemPrompt = `You're a tour assistant. User query doesn't fit standard categories. 

// Session: tourId=${session.currentTourId || 'none'}

// Capabilities: search tours, get details by ID, track tours

// Query: ${query}

// Provide brief, helpful response or ask for clarification.`;

//       const response = await this.anthropic.messages.create({
//         model: "claude-3-5-haiku-20241022",
//         max_tokens: 400,
//         system: systemPrompt,
//         messages: [{
//           role: "user",
//           content: query
//         }]
//       });

//       const content = response.content[0];
//       return content.type === 'text' ? content.text : this.getDefaultResponse();
//     } catch (error) {
//       console.error("LLM Error in generateSmartResponse:", error);
//       return this.getDefaultResponse();
//     }
//   }

//   private getDefaultResponse(): string {
//     return `Available commands:
// • "details [tour-id]" - Get tour details
// • "search [keyword]" - Find tours  
// • "track [tour-id]" - Tour tracking
// • "help" - Show all options

// Sample: details 39d11c40-7dba-11f0-a387-8508a0009d76`;
//   }

//   private extractTextFromResult(result: McpToolResult): string {
//     let resultText = "";
//     if (result && Array.isArray(result.content)) {
//       for (const item of result.content) {
//         if (item.type === "text" && item.text) {
//           resultText += item.text + "\n";
//         }
//       }
//     }
//     return resultText.trim() || "No results found.";
//   }

//   async close(): Promise<void> {
//     try {
//       if (this.mcp) {
//         await this.mcp.close();
//         console.log("✅ MCP client connection closed");
//       }
//     } catch (error: unknown) {
//       console.error("Error closing MCP connection:", error);
//     }
//   }
// }


import { UserSessionManager } from './models/userSession.js';
import { TourQueryContext } from '../../types/index.js';
import { McpConnectionService } from './mcpClient/mcpConnectionService.js';
import { QueryAnalysisService } from './mcpClient/queryAnalysisService.js';
import { GreetingHandler } from './handlers/greetingHandler.js';
import { HelpHandler } from './handlers/helpHandler.js';
import { SearchHandler } from './handlers/searchHandler.js';
import { TourDetailsHandler } from './handlers/tourDetailsHandler.js';
import { TrackingHandler } from './handlers/trackingHandler.js';
import { TourParser } from '../../utils/tourParser.js';

export class McpService {
  private connectionService: McpConnectionService;
  private queryAnalysisService: QueryAnalysisService;
  private greetingHandler: GreetingHandler;
  private helpHandler: HelpHandler;
  private searchHandler: SearchHandler;
  private tourDetailsHandler: TourDetailsHandler;
  private trackingHandler: TrackingHandler;
  private sessionManager: UserSessionManager;

  constructor(sessionManager: UserSessionManager, anthropicApiKey: string) {
    this.sessionManager = sessionManager;
    this.connectionService = new McpConnectionService();
    this.queryAnalysisService = new QueryAnalysisService(anthropicApiKey);
    this.greetingHandler = new GreetingHandler();
    this.helpHandler = new HelpHandler();
    this.searchHandler = new SearchHandler(this.connectionService, anthropicApiKey);
    this.tourDetailsHandler = new TourDetailsHandler(this.connectionService, anthropicApiKey);
    this.trackingHandler = new TrackingHandler(this.connectionService, anthropicApiKey);
  }

  async connectToServer(serverPath: string): Promise<void> {
    return await this.connectionService.connectToServer(serverPath);
  }

  async processQuery(query: string, userIdentifier: string = 'default-user'): Promise<string> {
    const session = this.sessionManager.getUserSession(userIdentifier);
    
    try {
      const intent = await this.queryAnalysisService.analyzeQueryIntent(query, session);
      
      // If LLM failed but we have a fallback, use it
      if (intent.responseType === "direct" && intent.intent === "help") {
        return this.helpHandler.getHelpResponse();
      }
      
      return await this.handleQueryBasedOnIntent(intent, { userIdentifier, query, session });
      
    } catch (error: unknown) {
      console.error("Error processing query:", error);
      
      // Try direct tour ID extraction as last resort
      const tourId = TourParser.extractTourId(query);
      if (tourId) {
        return await this.handleDirectTourId(tourId, { userIdentifier, query, session });
      }
      
      return "I'm having trouble understanding your request. Please try rephrasing or say 'help' for options.";
    }
  }

  private async handleQueryBasedOnIntent(intent: any, context: TourQueryContext): Promise<string> {
    const { session, query } = context;

    switch (intent.intent) {
      case 'greeting':
        return this.greetingHandler.handleGreeting();
            
      case 'thanks':
        return this.greetingHandler.handleThanks();
        
      case 'help':
        return this.helpHandler.getHelpResponse();
        
      case 'tour_details':
      case 'specific_question':
        return await this.tourDetailsHandler.handleTourDetailsRequest(intent, context);
        
      case 'tracking':
        return await this.trackingHandler.handleTrackingRequest(intent, context);
        
      case 'search':
        return await this.searchHandler.handleSearchRequest(intent, context);
        
      case 'direct_tour_id':
        return await this.handleDirectTourId(intent.tourId, context);
        
      default:
        return await this.queryAnalysisService.generateSmartResponse(query, session);
    }
  }

  private async handleDirectTourId(tourId: string, context: TourQueryContext): Promise<string> {
    context.session.currentTourId = tourId;
    context.session.awaitingTourId = false;
    
    try {
      console.log("🔧 Getting tour details for:", tourId);
      const result = await this.connectionService.callTool({
        name: "get-tour-details",
        arguments: { tourId }
      });
      
      const tourData = this.connectionService.extractTextFromResult(result);
      context.session.lastTourData = tourData;
      
      return await this.tourDetailsHandler.formatTourDetailsResponse(tourData, context.query);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Error: ${errorMessage}`;
    }
  }

  async close(): Promise<void> {
    return await this.connectionService.close();
  }
}