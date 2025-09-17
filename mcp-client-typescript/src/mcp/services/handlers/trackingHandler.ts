import { McpConnectionService } from '../mcpClient/mcpConnectionService.js';
import { ResponseFormatterService } from '../mcpClient/responserFormatterService.js';
import { TourQueryContext } from '../../../types/index.js';

export class TrackingHandler {
  private connectionService: McpConnectionService;
  private formatterService: ResponseFormatterService;

  constructor(connectionService: McpConnectionService, anthropicApiKey: string) {
    this.connectionService = connectionService;
    this.formatterService = new ResponseFormatterService(anthropicApiKey);
  }

  async handleTrackingRequest(intent: any, context: TourQueryContext): Promise<string> {
    const { session, query } = context;
    
    let tourId = intent.tourId || session.currentTourId;
    
    if (!tourId) {
      session.awaitingTourId = true;
      return "Need a tour ID for tracking. Example: track tour 39d11c40-7dba-11f0-a387-8508a0009d76";
    }
    
    const guestIdMatch = query.match(/guest[:\s]+([a-f0-9-]{36})/i);
    const guestId = guestIdMatch ? guestIdMatch[1] : undefined;
    
    try {
      console.log("🔧 Getting tour tracking for:", tourId, guestId ? `(guest: ${guestId})` : '');
      const result = await this.connectionService.callTool({
        name: "get-tour-tracking",
        arguments: { tourId, guestId }
      });
      
      const trackingData = this.connectionService.extractTextFromResult(result);
      return await this.formatterService.formatTrackingResponse(trackingData, query);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Error getting tracking: ${errorMessage}`;
    }
  }
}