import { BlaxelMcpClientTransport, settings } from "@blaxel/core";
import { Client as ModelContextProtocolClient } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment variables
const MCP_WEBSOCKET_URL = process.env.MCP_WEBSOCKET_URL;

if (!MCP_WEBSOCKET_URL) {
  console.error("MCP_WEBSOCKET_URL environment variable is required");
  console.error("Format: wss://run.blaxel.ai/{WORKSPACE}/functions/{FUNCTION_NAME}");
  process.exit(1);
}

// Server implementation
const server = new Server(
  {
    name: "mcp-beamlit-gateway",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let mcpClient: ModelContextProtocolClient | null = null;
let transport: BlaxelMcpClientTransport | null = null;

const initializeMcpClient = async () => {
  try {
    // Initialize transport with Blaxel settings
    transport = new BlaxelMcpClientTransport(
      MCP_WEBSOCKET_URL,
      settings.headers,
      { retry: { max: 0 } }
    );

    // Create MCP client
    mcpClient = new ModelContextProtocolClient(
      {
        name: "mcp-gateway-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Connect to the MCP server
    await mcpClient.connect(transport);

    console.error(`Connected to MCP server at ${MCP_WEBSOCKET_URL}`);
    return mcpClient;
  } catch (error) {
    console.error("Failed to initialize MCP client:", error);
    throw error;
  }
};


async function runServer(mcpClient: ModelContextProtocolClient) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // List available tools
    const toolsResponse = await mcpClient.listTools();
    return toolsResponse;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      while (!mcpClient) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const response = await mcpClient.callTool({
        name: request.params.name,
        arguments: request.params.arguments
      });
      return response;
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  });
  console.error("MCP Gateway Server running on stdio");
}

// Initialize MCP client and start server
initializeMcpClient()
.then((mcpClient) => {
  return runServer(mcpClient)
    .catch((error) => {
      console.error("Fatal error running server:", error);
      process.exit(1);
    });
})
.catch((error) => {
  console.error("Fatal error initializing MCP client:", error);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.error("Shutting down MCP Gateway...");
  if (mcpClient) {
    await mcpClient.close();
  }
  if (transport) {
    await transport.close();
  }
  process.exit(0);
});
