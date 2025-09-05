import { BlaxelMcpClientTransport, settings } from "@blaxel/core";
import { Client as ModelContextProtocolClient } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { parseArgs } from "node:util";

// Reconnection configuration
interface ReconnectConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: -1, // Infinite retries
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5,
};

async function main() {
  const {
    values: { url },
  } = parseArgs({
    options: {
      url: {
        type: "string",
        short: "w",
      },
    },
  });

  if (!url) {
    console.error("Please provide a WebSocket URL with the --url flag");
    console.error(
      "Format: wss://run.blaxel.ai/{WORKSPACE}/functions/{FUNCTION_NAME}"
    );
    console.error(
      "Example: --url wss://run.blaxel.ai/main/functions/blaxel-search"
    );
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
  let isConnecting = false;
  let shouldReconnect = true;
  let retryCount = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number, config: ReconnectConfig): number => {
    const delay =
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
  };

  const initializeMcpClient =
    async (): Promise<ModelContextProtocolClient | null> => {
      if (isConnecting) {
        return null;
      }

      isConnecting = true;

      try {
        // Clean up existing connections
        if (mcpClient) {
          try {
            await mcpClient.close();
          } catch (error) {
            console.error("Error closing existing MCP client:", error);
          }
          mcpClient = null;
        }

        if (transport) {
          try {
            await transport.close();
          } catch (error) {
            console.error("Error closing existing transport:", error);
          }
          transport = null;
        }

        // Initialize transport with Blaxel settings
        transport = new BlaxelMcpClientTransport(
          url,
          settings.headers,
          { retry: { max: 0 } } // Disable internal retry, we handle it ourselves
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

        // Set up connection event handlers
        if (transport && "on" in transport) {
          (transport as any).on("close", () => {
            console.error("WebSocket connection closed");
            if (shouldReconnect) {
              scheduleReconnect();
            }
          });

          (transport as any).on("error", (error: Error) => {
            console.error("WebSocket connection error:", error);
            if (shouldReconnect) {
              scheduleReconnect();
            }
          });
        }

        // Connect to the MCP server
        await mcpClient.connect(transport);

        console.error(`Connected to MCP server at ${url}`);
        retryCount = 0; // Reset retry count on successful connection
        return mcpClient;
      } catch (error) {
        console.error("Failed to initialize MCP client:", error);
        if (shouldReconnect) {
          scheduleReconnect();
        }
        return null;
      } finally {
        isConnecting = false;
      }
    };

  const scheduleReconnect = () => {
    if (!shouldReconnect || reconnectTimeout) {
      return;
    }

    const config = DEFAULT_RECONNECT_CONFIG;

    if (config.maxRetries >= 0 && retryCount >= config.maxRetries) {
      console.error(
        `Max reconnection attempts (${config.maxRetries}) reached. Giving up.`
      );
      return;
    }

    const delay = calculateDelay(retryCount, config);
    retryCount++;

    console.error(
      `Scheduling reconnection attempt ${retryCount} in ${delay}ms...`
    );

    reconnectTimeout = setTimeout(async () => {
      reconnectTimeout = null;
      console.error(`Attempting to reconnect (attempt ${retryCount})...`);

      const client = await initializeMcpClient();
      if (!client) {
        // initializeMcpClient will schedule another reconnect if needed
        return;
      }

      mcpClient = client;
      console.error("Successfully reconnected to MCP server");
    }, delay);
  };

  const waitForConnection = async (
    timeoutMs: number = 10000
  ): Promise<ModelContextProtocolClient | null> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (mcpClient && !isConnecting) {
        return mcpClient;
      }
      await sleep(100);
    }

    return null;
  };

  async function runServer() {
    const serverTransport = new StdioServerTransport();
    await server.connect(serverTransport);

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const client = await waitForConnection();
      if (!client) {
        throw new Error("MCP client not available - connection may be down");
      }

      try {
        const toolsResponse = await client.listTools();
        return toolsResponse;
      } catch (error) {
        console.error("Error listing tools:", error);
        // Trigger reconnection if the error suggests connection issues
        if (
          shouldReconnect &&
          error instanceof Error &&
          (error.message.includes("connection") ||
            error.message.includes("socket"))
        ) {
          scheduleReconnect();
        }
        throw error;
      }
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const client = await waitForConnection();
        if (!client) {
          return {
            content: [
              {
                type: "text",
                text: "Error: MCP client not available - connection may be down. Reconnection in progress...",
              },
            ],
            isError: true,
          };
        }

        const response = await client.callTool({
          name: request.params.name,
          arguments: request.params.arguments,
        });
        return response;
      } catch (error) {
        console.error("Error calling tool:", error);

        // Trigger reconnection if the error suggests connection issues
        if (
          shouldReconnect &&
          error instanceof Error &&
          (error.message.includes("connection") ||
            error.message.includes("socket"))
        ) {
          scheduleReconnect();
        }

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
    if (client) {
      mcpClient = client;
    }
    await runServer();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }

  // Cleanup on exit
  const cleanup = async () => {
    console.error("Shutting down Blaxel MCP Gateway...");
    shouldReconnect = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (error) {
        console.error("Error closing MCP client:", error);
      }
    }

    if (transport) {
      try {
        await transport.close();
      } catch (error) {
        console.error("Error closing transport:", error);
      }
    }

    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch(console.error);
