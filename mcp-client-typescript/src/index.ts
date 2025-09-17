import { Anthropic } from "@anthropic-ai/sdk";
import readline from 'readline/promises';

import { config } from './config/env.js';
import { UserSessionManager } from './mcp/services/models/userSession.js';
import { McpService } from './mcp/services/mcpService.js';
import { WhatsAppService } from './utils/whatsappService.js';
import { HttpServer } from './server/index.js';



export class TourClient {
  private anthropic: Anthropic;
  private rl: any;
  private sessionManager: UserSessionManager;
  private mcpService: McpService;
  private whatsappService: WhatsAppService;
  private httpServer: HttpServer;

  constructor() {
    // Validate Anthropic API key
    if (!config.anthropic.apiKey) {
      throw new Error("❌ Anthropic API key is required. Please set ANTHROPIC_API_KEY in your environment variables.");
    }

    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    
    this.sessionManager = new UserSessionManager();
    
    // Pass the Anthropic API key to McpService
    this.mcpService = new McpService(this.sessionManager, config.anthropic.apiKey);
    
    this.whatsappService = new WhatsAppService();
    this.httpServer = new HttpServer(this.mcpService, this.sessionManager, this.whatsappService);
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async connectToServer(serverPath: string): Promise<void> {
    try {
      await this.mcpService.connectToServer(serverPath);
      console.log("✅ Successfully connected to MCP server with LLM integration enabled");
    } catch (error) {
      console.error("❌ Failed to connect to MCP server:", error);
      throw error;
    }
  }

  async chatLoop(): Promise<void> {
    try {
      console.log("\n🚗 AI-Powered Tour Management Client Started!");
      console.log("🤖 Now powered by Anthropic Claude for intelligent responses!");
      console.log("Type 'quit' to exit or ask natural language questions about tours, guests, and tracking.");
      console.log("\n📋 Examples of what you can ask:");
      console.log("  • 'Show me details for tour 39d11c40-7dba-11f0-a387-8508a0009d76'");
      console.log("  • 'What's the client name for that tour?'");
      console.log("  • 'Track the status of my tour'");
      console.log("  • 'Find all VR Travels tours'");
      console.log("  • 'When is the tour scheduled?'");
      console.log("  • 'Show me guest pickup status'");
      console.log("  • 'Search for tours in Mumbai'");
      console.log("  • 'What can you help me with?'");
      console.log("  • Ask follow-up questions - I'll remember the context!");
      console.log("\n💡 Pro tip: Ask questions naturally, I understand context and can have conversations!\n");

      const testUser = 'test-user';
      
      while (true) {
        const message = await this.rl.question("💬 Your question: ");
        
        if (message.toLowerCase() === 'quit' || message.toLowerCase() === 'exit') {
          console.log("\n👋 Thank you for using the AI-Powered Tour Management Client!");
          console.log("🤖 Hope the intelligent responses were helpful!");
          break;
        }

        // Skip empty messages
        if (!message.trim()) {
          continue;
        }

        this.sessionManager.addToChatHistory(testUser, 'user', message);
        
        console.log("\n🔄 Processing your request with AI...");
        
        try {
          const response = await this.mcpService.processQuery(message, testUser);
          
          this.sessionManager.addToChatHistory(testUser, 'assistant', response);
          
          console.log("\n🤖 AI Assistant:\n", response);
          console.log("\n" + "─".repeat(80));
          
        } catch (error) {
          console.error("\n❌ Error processing your request:", error);
          console.log("Please try rephrasing your question or check your connection.");
          console.log("\n" + "─".repeat(80));
        }
      }
    } catch (error: unknown) {
      console.error("❌ Chat loop error:", error);
    } finally {
      this.rl.close();
    }
  }

  startHttpServer(port = config.server.port): void {
    try {
      this.httpServer.start(port);
      console.log(`🌐 HTTP Server started on port ${port} with AI-powered endpoints`);
    } catch (error) {
      console.error("❌ Error starting HTTP server:", error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log("\n🧹 Cleaning up resources...");
      await this.mcpService.close();
      this.httpServer.close();
      console.log("✅ Cleanup completed successfully");
    } catch (error: unknown) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  // Method to test the AI integration
  async testAIIntegration(): Promise<void> {
    console.log("\n🧪 Testing AI integration...");
    try {
      const testResponse = await this.mcpService.processQuery("Hello, can you help me?", "test-user");
      console.log("✅ AI integration test successful");
      console.log("🤖 Test response:", testResponse.substring(0, 100) + "...");
    } catch (error) {
      console.error("❌ AI integration test failed:", error);
      throw error;
    }
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting AI-Powered Tour Management Client...");
  
  let client: TourClient;
  
  try {
    // Initialize client (this will validate API key)
    client = new TourClient();
    console.log("✅ TourClient initialized with AI capabilities");
    
    if (process.argv.length < 3) {
      console.log("\n❌ Usage: node build/index.js <path_to_server_script>");
      console.log("Example: node build/index.js ../tour-server/build/index.js");
      console.log("\n💡 Make sure you have ANTHROPIC_API_KEY set in your environment variables");
      process.exit(1);
    }

    const serverPath = process.argv[2];
    console.log(`🔗 Connecting to MCP server: ${serverPath}`);
    
    // Connect to MCP server
    await client.connectToServer(serverPath);
    
    // Test AI integration
    await client.testAIIntegration();
    
    // Start HTTP server
    client.startHttpServer();
    
    // Start interactive chat loop
    await client.chatLoop();
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Anthropic API key")) {
        console.error("\n❌ Configuration Error:", error.message);
        console.log("\n💡 To fix this:");
        console.log("1. Get your API key from: https://console.anthropic.com/");
        console.log("2. Set it as an environment variable: export ANTHROPIC_API_KEY=your_key_here");
        console.log("3. Or add it to your .env file: ANTHROPIC_API_KEY=your_key_here");
      } else {
        console.error("💥 Fatal error:", error.message);
      }
    } else {
      console.error("💥 Fatal error:", error);
    }
    process.exit(1);
  } finally {
    if (client!) {
      await client.cleanup();
    }
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT (Ctrl+C), shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}