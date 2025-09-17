import { McpConnectionService } from '../mcpClient/mcpConnectionService.js';
import { ResponseFormatterService } from '../mcpClient/responserFormatterService.js';
import { TourQueryContext } from '../../../types/index.js';

export class SearchHandler {
  private connectionService: McpConnectionService;
  private formatterService: ResponseFormatterService;

  constructor(connectionService: McpConnectionService, anthropicApiKey: string) {
    this.connectionService = connectionService;
    this.formatterService = new ResponseFormatterService(anthropicApiKey);
  }

  async handleSearchRequest(intent: any, context: TourQueryContext): Promise<string> {
    const { query } = context;
    
    let searchQuery = intent.parameters?.query;
    if (!searchQuery) {
      searchQuery = query.replace(/search|for|find|tour|tours/gi, '').trim() || "VR";
    }
    
    try {
      console.log("🔧 Searching tours for:", searchQuery);
      const result = await this.connectionService.callTool({
        name: "search-tours",
        arguments: { query: searchQuery, maxResults: 10 }
      });
      
      const searchResults = this.connectionService.extractTextFromResult(result);
      return await this.formatterService.formatSearchResponse(searchResults, query);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Search error: ${errorMessage}`;
    }
  }
}