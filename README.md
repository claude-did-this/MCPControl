# MCPControl

Windows control server for the Model Context Protocol, providing programmatic control over system operations including mouse, keyboard, window management, and screen capture functionality.

I developed this project as an experiment a few months ago, wanting to see if Claude could play some video games. After seeing it work, I was impressed but set it aside. Recently, it's gained attention from the community, prompting me to resume development. While currently in pre-release state, I'm actively working toward a stable version. If you encounter any issues or want to help with testing, please submit them through the issue tracker.

> **Note**: This project currently supports Windows only.

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
  - Mouse movement
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

## Usage

Simply configure your Claude MCP settings to use MCPControl as shown in the [MCP Server Configuration](#mcp-server-configuration) section. No installation needed!

### Building From Source

If you're interested in contributing or building from source, please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

#### Development Requirements

To build this project for development, you'll need:

1. Windows operating system (required for the keysender dependency)
2. Node.js 18 or later (install using the official Windows installer which includes build tools)
3. npm package manager
4. Native build tools:
   - node-gyp: `npm install -g node-gyp`
   - cmake-js: `npm install -g cmake-js`

The keysender dependency relies on Windows-specific native modules that require these build tools.

## MCP Server Configuration

To use this project, you'll need the necessary build tools:

1. Install Node.js using the official Windows installer, which includes necessary build tools
2. Install additional required tools:

```
npm install -g node-gyp
npm install -g cmake-js
```

Then, add the following configuration to your MCP settings:


```json
{
  "mcpServers": {
    "MCPControl": {
      "command": "npx",
      "args": [
        "--no-cache",
        "-y",
        "mcp-control"
      ]
    }
  }
}
```

After configuring your MCP settings, restart your client to see the MCPControl service in the menu.

## Project Structure

- `/src`
  - `/handlers` - Request handlers and tool management
  - `/tools` - Core functionality implementations
  - `/types` - TypeScript type definitions
  - `index.ts` - Main application entry point

## Dependencies

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK for protocol implementation
- [keysender](https://www.npmjs.com/package/keysender) - Windows-only UI automation library
- [clipboardy](https://www.npmjs.com/package/clipboardy) - Clipboard handling
- [sharp](https://www.npmjs.com/package/sharp) - Image processing
- [uuid](https://www.npmjs.com/package/uuid) - UUID generation

## Testing

The project currently includes unit tests for core functionality. The following test areas are planned for future development:
- Integration tests for cross-module functionality
- Performance testing
- Error handling validation

## Known Limitations

- Window minimize/restore operations are currently unsupported
- Multiple screen functions may not work as expected, depending on setup
- The get_screenshot utility does not work with the VS Code Extension Cline. See [GitHub issue #1865](https://github.com/cline/cline/issues/1865)
- Some operations may require elevated permissions depending on the target application
- Only Windows is supported
- Click accuracy is currently working best at 1280x720 resolution, single screen. We're working on an offset/scaling bug and looking for testers or help creating testing tools

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## References

- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)
