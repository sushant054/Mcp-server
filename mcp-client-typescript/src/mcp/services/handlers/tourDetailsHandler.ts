import { McpConnectionService } from '../mcpClient/mcpConnectionService.js';
import { ResponseFormatterService } from '../mcpClient/responserFormatterService.js';
import { TourParser } from '../../../utils/tourParser.js';
import { TourQueryContext } from '../../../types/index.js';

export class TourDetailsHandler {
  private connectionService: McpConnectionService;
  private formatterService: ResponseFormatterService;

  constructor(connectionService: McpConnectionService, anthropicApiKey: string) {
    this.connectionService = connectionService;
    this.formatterService = new ResponseFormatterService(anthropicApiKey);
  }

  async handleTourDetailsRequest(intent: any, context: TourQueryContext): Promise<string> {
    const { session } = context;
    
    let tourId = intent.tourId;
    
    if (!tourId && session.currentTourId) {
      tourId = session.currentTourId;
      return `I see we were previously discussing tour ${session.currentTourId}. Would you like details for this same tour, or do you have a different tour ID?`;
    }
    
    if (!tourId) {
      session.awaitingTourId = true;
      return "Need a tour ID. Example: 39d11c40-7dba-11f0-a387-8508a0009d76";
    }
    
    session.currentTourId = tourId;
    session.awaitingTourId = false;
    
    try {
      console.log("🔧 Getting tour details for:", tourId);
      const result = await this.connectionService.callTool({
        name: "get-tour-details",
        arguments: { tourId }
      });
      
      const tourData = this.connectionService.extractTextFromResult(result);
      session.lastTourData = tourData;
      
      if (intent.intent === 'specific_question') {
        return await this.extractSpecificInformation(tourData, context.query);
      }
      
      return await this.formatTourDetailsResponse(tourData, context.query);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Error getting tour details: ${errorMessage}`;
    }
  }

  async formatTourDetailsResponse(tourData: string, query: string): Promise<string> {
    return await this.formatterService.formatTourDetailsResponse(tourData, query);
  }

  private async extractSpecificInformation(tourData: string, query: string): Promise<string> {
    try {
      // Delegate to your existing TourParser
      const result = TourParser.extractSpecificTourInfo(tourData, query);
      
      // If the parser returned the full data (meaning it couldn't extract specific info),
      // use LLM as a fallback
      if (result.length > 500 || result === tourData) {
        return await this.formatterService.extractSpecificInformation(tourData, query);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error extracting specific info:', error);
      return await this.formatterService.extractSpecificInformation(tourData, query);
    }
  }
}