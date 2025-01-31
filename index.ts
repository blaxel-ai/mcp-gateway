import { MCPClient, init, listFunctions, newClient } from "@beamlit/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

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

const clients: Record<string, { client: MCPClient; tools: Tool[] }> = {};

const listTools = async () => {
  const settings = init();
  const beamlit = newClient();

  const { response, data: functions } = await listFunctions({
    client: beamlit,
    query: { environment: "production" },
  });
  if (response.status >= 400) {
    console.error(response.statusText);
    throw new Error(response.statusText);
  }
  await Promise.all(
    (functions ?? []).map(async (func) => {
      if (func.metadata?.name && func.spec?.runtime?.type === "mcp") {
        const url = `${settings.runUrl}/${settings.workspace}/functions/${func.metadata.name}`;
        const mcpClient = new MCPClient(beamlit, url);
        const toolsFunction = await mcpClient.listTools();
        toolsFunction.tools.forEach((tool) => {
          clients[tool.name] = {
            client: mcpClient,
            tools: [tool],
          };
        });
      }
      return "";
    })
  );
  const tools = Object.values(clients).flatMap((client) => client.tools);
  return {
    tools,
  };
};

server.setRequestHandler(ListToolsRequestSchema, listTools);
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const client = clients[request.params.name];
    if (!client) {
      throw new Error(`Client not found for tool ${request.params.name}`);
    }
    const response = await client.client.callTool(
      request.params.name,
      request.params.arguments
    );
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

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Gateway Server running on stdio");
}
listTools().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
