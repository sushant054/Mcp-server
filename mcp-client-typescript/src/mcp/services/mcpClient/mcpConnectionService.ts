import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpToolResult } from '../../../types';

export class McpConnectionService {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];

  constructor() {
    this.mcp = new Client({ 
      name: "tour-client", 
      version: "1.0.0" 
    });
  }

  async connectToServer(serverPath: string): Promise<void> {
    try {
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });
      
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools;
      
      console.log(
        "✅ Connected to server with tools:",
        this.tools.map((t: any) => t.name)
      );

    } catch (error: unknown) {
      console.error("❌ Failed to connect to MCP server:", error);
      throw error;
    }
  }

  async callTool(request: { name: string; arguments: any }): Promise<McpToolResult> {
    return await this.mcp.callTool(request);
  }

  extractTextFromResult(result: McpToolResult): string {
    let resultText = "";
    if (result && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === "text" && item.text) {
          resultText += item.text + "\n";
        }
      }
    }
    return resultText.trim() || "No results found.";
  }

  async close(): Promise<void> {
    try {
      if (this.mcp) {
        await this.mcp.close();
        console.log("✅ MCP client connection closed");
      }
    } catch (error: unknown) {
      console.error("Error closing MCP connection:", error);
    }
  }
}