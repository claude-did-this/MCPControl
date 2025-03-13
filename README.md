# MCPcontrol

A cross-platform control server for the Model Context Protocol (MCP), providing programmatic control over system operations including mouse, keyboard, window management, and screen capture functionality. Built on [nut.js](https://nutjs.dev/).

I developed this project as an experiment a few months ago, wanting to see if Claude could play some video games. After seeing it work, I was impressed but set it aside. Recently, it's gained attention from the community, prompting me to resume development. While currently in pre-release state, I'm actively working toward a stable version. If you encounter any issues, please submit them through the issue tracker.

> **Note**: This project aims to support Windows, Linux, and macOS. While most testing has been performed on Windows, cross-platform compatibility contributions are welcome.

## ⚠️ IMPORTANT DISCLAIMER

**THIS SOFTWARE IS EXPERIMENTAL AND POTENTIALLY DANGEROUS**

By using this software, you acknowledge and accept that:

- Giving AI models direct control over your computer through this tool is inherently risky
- This software can control your mouse, keyboard, and other system functions which could potentially cause unintended consequences
- You are using this software entirely at your own risk
- The creators and contributors of this project accept NO responsibility for any damage, data loss, or other consequences that may arise from using this software
- This tool should only be used in controlled environments with appropriate safety measures in place

**USE AT YOUR OWN RISK**

## Features

- **Window Management**
  - List all windows
  - Get active window information
  - Get window titles
  - Get window size and position
  - Focus windows
  - Resize windows
  - Reposition windows

- **Mouse Control**
  - Mouse movement with configurable speed
  - Click operations
  - Scroll functionality
  - Drag operations
  - Cursor position tracking

- **Keyboard Control**
  - Text input
  - Key combinations
  - Key press/release operations
  - Hold key functionality

- **Screen Operations**
  - Screen capture
  - Screen size retrieval
  - Active window detection

- **Clipboard Integration**
  - Get clipboard content
  - Set clipboard content
  - Clear clipboard
  - Check clipboard state

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Cheffromspace/MCPcontrol.git
cd MCPcontrol
```

2. Build the project (this will handle libnut-core and all dependencies):
```bash
# Install dependencies
npm install

# Build everything including libnut-core
npm run build:all
```

For manual building, you can still follow these steps:
```bash
# Install cmake-js globally (required for building)
npm install -g cmake-js

# Clone libnut repository directly in the project directory
git clone https://github.com/nut-tree/libnut.git libnut-core
cd libnut-core

# Install dependencies and build
npm install
cmake-js rebuild

# Return to the main project
cd ..

# Build MCPControl
npm run build
```

### Running Tests

Run all tests:
```bash
npm test
```

Generate coverage report:
```bash
npm run test:coverage
```

## MCP Server Configuration

To use this project with Claude, add the following configuration to your MCP servers:

```json
{
  "mcpServers": {
    "MCPcontrol": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "[INSTALL LOCATION]\\MCPcontrol\\build\\index.js"
      ]
    }
  }
}
```

After configuring your MCP server, restart Claude to see the MCPcontrol service in the menu.

## Project Structure

- `/src`
  - `/handlers` - Request handlers and tool management
  - `/tools` - Core functionality implementations
  - `/types` - TypeScript type definitions
  - `index.ts` - Main application entry point

## Dependencies

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK for protocol implementation
- [@nut-tree/libnut](https://github.com/nut-tree/libnut) - Core native UI automation library
- [clipboardy](https://www.npmjs.com/package/clipboardy) - Cross-platform clipboard handling
- [express](https://expressjs.com/) - Web server framework
- [jimp](https://www.npmjs.com/package/jimp) & [sharp](https://www.npmjs.com/package/sharp) - Image processing

## Testing

The project currently includes unit tests for core functionality. The following test areas are planned for future development:
- Integration tests for cross-module functionality
- Performance testing
- Error handling validation

## Known Limitations

- Window minimize/restore operations are currently unsupported in libnut-core
- Advanced screen information (multiple monitors, DPI settings) is limited to main display
- Some operations may require elevated permissions depending on the target application
- Cross-platform support (Linux/macOS) is untested

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## References

- [NutJS Documentation](https://nutjs.dev/)
- [NutJS GitHub Repository](https://github.com/nut-tree/nut.js)
- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)
