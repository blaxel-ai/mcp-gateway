import { BlaxelMcpClientTransport, settings } from "@blaxel/core";
import { Client as ModelContextProtocolClient } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { parseArgs } from 'node:util';

async function main() {
  const {
    values: { url },
  } = parseArgs({
    options: {
      url: {
        type: 'string',
        short: 'w',
      },
    },
  });

  if (!url) {
    console.error("Please provide a WebSocket URL with the --url flag");
    console.error("Format: wss://run.blaxel.ai/{WORKSPACE}/functions/{FUNCTION_NAME}");
    console.error("Example: --url wss://run.blaxel.ai/main/functions/blaxel-search");
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
        url,
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

      console.error(`Connected to MCP server at ${url}`);
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
    console.error("Blaxel MCP Gateway Server running on stdio");
  }

  // Initialize MCP client and start server
  try {
    const client = await initializeMcpClient();
    await runServer(client);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.error("Shutting down Blaxel MCP Gateway...");
    if (mcpClient) {
      await mcpClient.close();
    }
    if (transport) {
      await transport.close();
    }
    process.exit(0);
  });
}

main().catch(console.error);
