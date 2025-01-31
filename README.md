# Beamlit MCP Server

An MCP (Model Context Protocol) server implementation for interacting with Beamlit CLI, enabling seamless integration with AI models.

## Features

- **MCP Integration**: Full support for Model Context Protocol standards
- **Beamlit CLI Integration**: Seamless interaction with Beamlit command-line interface
- **Extensible Architecture**: Easy to extend and customize for specific use cases

## Prerequisites

### Required Software

- Beamlit CLI installed on your system
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installing Beamlit CLI

## Configuration

### Setting up MCP Server

Add this configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "beamlit": {
      "command": "npx",
      "args": ["-y", "@beamlit/mcp-gateway"]
    }
  }
}
```

## Usage

### Basic Commands

```
npm run watch # watch for changes and build mcp servers
npm run start # run mcp server
npm run client # run mcp client
```

### Integration with Claude Desktop

1. Ensure Beamlit CLI is properly installed
2. Configure your MCP server settings
3. Connect through Claude Desktop interface

## Development

### Building from Source

```bash
git clone https://github.com/your-repo/beamlit-mcp-gateway
cd beamlit-mcp-gateway
npm install
npm run build
```

## Troubleshooting

Common issues and their solutions:

- Server connection issues: Verify Beamlit CLI installation
- Configuration errors: Check your `claude_desktop_config.json`
- Permission issues: Ensure proper system permissions

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

- Check the [documentation](https://docs.beamlit.dev)
- Open an issue in the GitHub repository
- Contact the maintainers

## Acknowledgments

- Model Context Protocol (MCP) community
- Beamlit CLI contributors
- Claude Desktop team
