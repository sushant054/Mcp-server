import { AnthropicService } from '../llm/anthropicService.js';

export class ResponseFormatterService {
  private anthropicService: AnthropicService;

  constructor(anthropicApiKey: string) {
    this.anthropicService = new AnthropicService(anthropicApiKey);
  }

  async formatTourDetailsResponse(tourData: string, query: string): Promise<string> {
    const systemPrompt = `Format tour data concisely. Include key details: tour ID, client, dates, status, guests. Keep it brief and organized.

Tour data: ${tourData}
Query: ${query}`;

    try {
      return await this.anthropicService.createMessage({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{
          role: "user" as const, 
          content: "Format tour information briefly."
        }]
      });
    } catch (error) {
      console.error("LLM Error in formatTourDetailsResponse:", error);
      return tourData;
    }
  }

  async formatTrackingResponse(trackingData: string, query: string): Promise<string> {
    const systemPrompt = `Format tracking data briefly. Focus on: current status, guest locations, pickup/drop status, driver info. Keep concise.

Tracking data: ${trackingData}
Query: ${query}`;

    try {
      return await this.anthropicService.createMessage({
        model: "claude-3-5-haiku-20241022", 
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
          role: "user" as const,
          content: "Format tracking information briefly."
        }]
      });
    } catch (error) {
      console.error("LLM Error in formatTrackingResponse:", error);
      return trackingData;
    }
  }

  async formatSearchResponse(searchResults: string, query: string): Promise<string> {
    try {
      const systemPrompt = `Format search results briefly. Show: number found, key details per tour (ID, client, date), keep it scannable.

Search results: ${searchResults}
Query: ${query}`;

      return await this.anthropicService.createMessage({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 700, 
        system: systemPrompt,
        messages: [{
          role: "user" as const,
          content: "Format search results briefly."
        }]
      });
    } catch (error) {
      console.error("LLM Error in formatSearchResponse:", error);
      return `Search Results:\n${searchResults}`;
    }
  }

  async extractSpecificInformation(tourData: string, query: string): Promise<string> {
    const systemPrompt = `Extract ONLY the specific information requested from the tour data. 
    Be concise and direct. Do not include the full tour details unless specifically asked.

    Query: ${query}
    
    Return ONLY the answer, no additional text.`;

    try {
      return await this.anthropicService.createMessage({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 200,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{
          role: "user" as const,
          content: `Tour Data: ${tourData}\n\nExtract the information requested in the query.`
        }]
      });
    } catch (error) {
      return "I couldn't extract the specific information you requested from the tour data.";
    }
  }
}