import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

class TourServer {
  private server: McpServer;
  private serverUrl: string;
  private bearerToken: string;

  constructor(serverUrl: string, bearerToken: string) {
    this.serverUrl = serverUrl;
    this.bearerToken = bearerToken;
    this.server = new McpServer({
      name: "tour-server",
      version: "1.0.0",
    });

    // Log configuration on startup
    console.error(`🔧 Server URL: ${this.serverUrl}`);
    console.error(`🔧 Bearer Token: ${this.bearerToken ? 'PROVIDED' : 'MISSING'}`);

    this.setupTools();
  }

  private setupTools() {
    // Get tour details by ID
    this.server.tool(
      "get-tour-details",
      "Get detailed information about a specific tour by its ID",
      {
        tourId: z.string().describe("The ID of the tour to retrieve"),
      },
      async ({ tourId }) => {
        try {
          console.error(`🔍 Attempting to fetch tour: ${tourId}`);
          const tourDetails = await this.fetchTourDetails(tourId);
          
          if (!tourDetails) {
            return {
              content: [{
                type: "text",
                text: `❌ Tour with ID "${tourId}" not found. Please check the tour ID and try again.`
              }]
            };
          }

          return {
            content: [{
              type: "text",
              text: this.formatTourDetails(tourDetails)
            }]
          };
        } catch (error) {
          console.error("❌ Error fetching tour details:", error);
          return {
            content: [{
              type: "text",
              text: `❌ Failed to fetch tour details. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );

    // Test connectivity tool
    this.server.tool(
      "test-connection",
      "Test the connection to the API server",
      {},
      async () => {
        try {
          const testUrl = `${this.serverUrl}/api/health`;
          console.error(`🔍 Testing connection to: ${testUrl}`);
          
          const response = await axios.get(testUrl, {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${this.bearerToken}`,
              'Accept': 'application/json'
            }
          });

          return {
            content: [{
              type: "text",
              text: `✅ Connection successful! Status: ${response.status}\nServer URL: ${this.serverUrl}\nBearer Token: ${this.bearerToken ? 'Present' : 'Missing'}`
            }]
          };
        } catch (error: any) {
          console.error("❌ Connection test failed:", error.message);
          return {
            content: [{
              type: "text",
              text: `❌ Connection failed!\nServer URL: ${this.serverUrl}\nBearer Token: ${this.bearerToken ? 'Present' : 'Missing'}\nError: ${error.message}`
            }]
          };
        }
      }
    );
  }

  private async fetchTourDetails(tourId: string): Promise<any> {
    // **CRITICAL: This is the corrected URL path**
    const url = `${this.serverUrl}/api/tours/${tourId}`;
    console.error(`🌐 Making request to: ${url}`);
    console.error(`🔑 Using bearer token: ${this.bearerToken ? 'YES' : 'NO'}`);

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.error(`✅ Response status: ${response.status}`);
      console.error(`📊 Response data structure: ${typeof response.data}`);
      
      // Log the structure to help debug
      if (response.data) {
        console.error(`📋 Data keys: ${Object.keys(response.data)}`);
      }

      return response.data.data; // Your data is nested under "data" property
      
    } catch (error: any) {
      console.error(`❌ Request failed:`, {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.error(`🔍 404 Error - The endpoint ${url} was not found`);
          return null;
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication failed: Invalid or expired bearer token');
        }
        if (error.response?.status === 403) {
          throw new Error('Access forbidden: Insufficient permissions');
        }
        throw new Error(`HTTP ${error.response?.status}: ${error.response?.statusText || error.message}`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to server at ${this.serverUrl}. Is the server running on port 3019?`);
      }
      
      throw new Error(`Network error: ${error.message}`);
    }
  }

  private formatTourDetails(tour: any): string {
    const startDate = tour.startDate ? new Date(parseInt(tour.startDate)).toLocaleString() : 'Not set';
    const endDate = tour.endDate ? new Date(parseInt(tour.endDate)).toLocaleString() : 'Not set';
    const pickupTime = this.formatTime(tour.pickupTime);
    const garajTime = this.formatTime(tour.garajTime);
    
    return `
🚗 TOUR DETAILS 🚗

📋 ID: ${tour.id}
🏷️ Human Readable ID: ${tour.humanReadableId}
📊 Status: ${tour.status}
📧 Booking Request: ${tour.bookingRequest}
💰 Payment Method: ${tour.paymentMethod}
🚘 Vehicle Type: ${tour.vehicalType} ${tour.withAC ? '(with AC)' : '(without AC)'}
👥 Number of Guests: ${tour.numberOfGuest}

📍 Pickup: ${tour.pickup || 'Not specified'}
📍 Drop: ${tour.drop || 'Not specified'}
📅 Start Date: ${startDate}
📅 End Date: ${endDate}
⏰ Pickup Time: ${pickupTime}
⏰ Garaj Time: ${garajTime}

📝 Note: ${tour.note || 'No notes'}
📋 Tour Info: ${tour.tourInfo || 'No tour info'}

👤 CLIENT: ${tour.Client?.name} (${tour.Client?.email})
🏢 ORGANIZATION: ${tour.Organization?.name}
📞 CONTACT: ${tour.ContactPerson?.name} (${tour.ContactPerson?.mobile})

${tour.Guests && tour.Guests.length > 0 ? `
👥 GUESTS (${tour.Guests.length}):
${tour.Guests.map((guest: any, index: number) => 
  `${index + 1}. ${guest.name} ${guest.isPrimary ? '⭐' : ''}
     📞 ${guest.mobile || 'No mobile'}
     📍 From: ${guest.pickup}
     📍 To: ${guest.drop}`
).join('\n')}
` : 'No guests'}

📅 Created: ${new Date(tour.createdAt).toLocaleString()}
    `.trim();
  }

  private formatTime(timeString: string | null): string {
    if (!timeString) return 'Not set';
    
    try {
      if (timeString.length > 10) {
        return new Date(parseInt(timeString)).toLocaleTimeString();
      }
      
      const milliseconds = parseInt(timeString);
      const hours = Math.floor(milliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return timeString;
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚗 Tour MCP Server running on stdio with enhanced debugging");
  }
}

// Start the server with configuration validation
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3019";
const BEARER_TOKEN = process.env.BEARER_TOKEN;

console.error("🚀 Starting Tour MCP Server...");
console.error(`📡 Server URL: ${SERVER_URL}`);
console.error(`🔑 Bearer Token: ${BEARER_TOKEN ? 'Configured' : '❌ MISSING'}`);

if (!BEARER_TOKEN) {
  console.error("❌ BEARER_TOKEN environment variable is required");
  console.error("💡 Create a .env file with: BEARER_TOKEN=your_token_here");
  process.exit(1);
}

const tourServer = new TourServer(SERVER_URL, BEARER_TOKEN);

tourServer.start().catch((error) => {
  console.error("💥 Fatal error starting server:", error);
  process.exit(1);
});