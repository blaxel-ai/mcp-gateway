# Blaxel MCP Gateway

An MCP (Model Context Protocol) gateway that connects to Blaxel-hosted MCP servers and exposes them as stdio MCP servers for use in Cursor and other MCP-compatible clients.

## Features

- **Blaxel MCP Integration**: Connect to any MCP server hosted on Blaxel
- **Stdio Transport**: Exposes Blaxel MCP servers as stdio MCP servers
- **Automatic Tool Discovery**: Automatically discovers and exposes all tools from the connected MCP server
- **Cursor Integration**: Ready to use with Cursor and other MCP-compatible clients

## Usage

### Configuration

Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "blaxel-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@blaxel/mcp-gateway@latest"
      ],
      "env": {
        "MCP_WEBSOCKET_URL": "wss://run.blaxel.ai/{YOUR_WORKSPACE}/functions/{YOUR_MCP_SERVER_NAME}"
      }
    }
  }
}
```

## Prerequisites

- Node.js (version 16 or higher)
- npm, yarn, or pnpm package manager
- Blaxel account with deployed MCP servers

## Installation

```bash
npm install -g @blaxel/mcp-gateway
```

Or install locally:

```bash
git clone https://github.com/blaxel-ai/mcp-gateway
cd mcp-gateway
npm install
npm run build
```

## Configuration

### Environment Variables

Set the following environment variable to connect to your Blaxel MCP server:

```bash
MCP_WEBSOCKET_URL="wss://run.blaxel.ai/{YOUR_WORKSPACE}/functions/{YOUR_MCP_SERVER_NAME}"
```

### Authentication

The gateway uses Blaxel's automatic authentication. Make sure you're authenticated with Blaxel CLI:

```bash
bl login
```

Or set environment variables:

```bash
export BL_API_KEY="your-api-key"
export BL_WORKSPACE="your-workspace"
```

## Development

```bash
npm run build    # Build the TypeScript code
MCP_WEBSOCKET_URL="wss://run.blaxel.ai/{YOUR_WORKSPACE}/functions/{YOUR_MCP_SERVER_NAME}" npx @modelcontextprotocol/inspector node dist/index.js # Debug
```

### Project Structure

- `index.ts` - Main MCP gateway implementation
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## How It Works

1. **Connection**: The gateway connects to a Blaxel MCP server via WebSocket using the provided URL
2. **Tool Discovery**: It automatically discovers all available tools from the connected MCP server
3. **Proxy**: It acts as a proxy, forwarding tool calls from the stdio client to the Blaxel MCP server
4. **Response Handling**: It forwards responses back to the stdio client

## Troubleshooting

### Common Issues

- **Connection Failed**: Verify your WebSocket URL and authentication
- **No Tools Found**: Ensure your Blaxel MCP server is running and has tools
- **Authentication Error**: Make sure you're logged in with Blaxel CLI or have valid API keys

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, please:

- Check the [Blaxel documentation](https://docs.blaxel.ai)
- Open an issue in the GitHub repository
- Contact the maintainers

## Acknowledgments

- Model Context Protocol (MCP) community
- Blaxel team for the MCP hosting infrastructure
- Cursor team for MCP integration
