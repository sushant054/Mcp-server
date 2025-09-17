import Anthropic from '@anthropic-ai/sdk';

export class AnthropicService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey
    });
  }

  async createMessage(params: {
    model: string;
    max_tokens: number;
    temperature?: number;
    system?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<string> {
    const response = await this.anthropic.messages.create(params);
    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  async analyzeQueryIntent(systemPrompt: string, query: string): Promise<any> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        temperature: 0.1, // Lower temperature for more consistent JSON
        system: systemPrompt,
        messages: [{
          role: "user" as const,
          content: query
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response (in case LLM adds extra text)
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(content.text);
      }
      throw new Error("No text response from LLM");
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError);
      throw parseError;
    }
  }
}