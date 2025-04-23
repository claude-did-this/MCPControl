# MCPControl

Windows control server for the Model Context Protocol, providing programmatic control over system operations including mouse, keyboard, window management, and screen capture functionality.

> **Note**: This project currently supports Windows only.

## Quick Demo (30-Second Wow Demo)

Want to see what MCPControl can do in 30 seconds? Try our interactive demo:

```bash
# Run the demo with just one command
node demo.cjs
```

The demo will:
1. Show you available MCPControl tools
2. Display your screen size
3. Track your cursor position
4. Identify active window information
5. Optionally take a screenshot and save it to your desktop

No need to run anything else - the demo manages the MCPControl server for you!

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

### Quick Start

The simplest way to use MCPControl is through JSON-RPC:

```javascript
// In a Node.js script
const { spawn } = require("child_process");
const readline = require("readline");

// Start the MCP Control server as a child process
const proc = spawn("npx", ["-y", "mcp-control"], {
  shell: true,
  stdio: ["pipe", "pipe", "inherit"],
});

// Read responses
const rl = readline.createInterface({ input: proc.stdout });
rl.on("line", (line) => {
  try {
    const response = JSON.parse(line);
    console.log("Response:", response);
  } catch (e) {
    console.log("←", line);
  }
});

// Send a command
proc.stdin.write(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_screen_size",
      arguments: {}
    },
  }) + "\n"
);
```

### MCP Server Configuration

To use with Claude MCP, add the following configuration to your MCP settings:

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

## Building From Source

If you're interested in contributing or building from source, please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

### Development Requirements

To build this project for development, you'll need:

1. Windows operating system (required for the keysender dependency)
2. Node.js 18 or later (install using the official Windows installer which includes build tools)
3. npm package manager
4. Native build tools:
   - node-gyp: `npm install -g node-gyp`
   - cmake-js: `npm install -g cmake-js`

## Available Tools

MCPControl provides the following tools:

- `get_screenshot`: Capture a screenshot
- `click_at`: Click at specific coordinates
- `move_mouse`: Move the mouse cursor
- `click_mouse`: Click at the current position
- `drag_mouse`: Drag from one position to another
- `scroll_mouse`: Scroll the mouse wheel
- `type_text`: Type text using the keyboard
- `press_key`: Press a keyboard key
- `press_key_combination`: Press multiple keys simultaneously
- `hold_key`: Hold or release a key
- `get_screen_size`: Get screen dimensions
- `get_cursor_position`: Get current cursor position
- `get_active_window`: Get info about the active window
- `get_clipboard_content`: Get clipboard text
- `set_clipboard_content`: Set clipboard text

And many more!

## Known Limitations

- Window minimize/restore operations are currently unsupported
- Multiple screen functions may not work as expected, depending on setup
- The get_screenshot utility does not work with the VS Code Extension Cline. See [GitHub issue #1865](https://github.com/cline/cline/issues/1865)
- Some operations may require elevated permissions depending on the target application
- Only Windows is supported
- Ctrl key combinations (Ctrl+C, Ctrl+V, etc.) may cause the server to crash due to stdio handling issues. This will be fixed in an upcoming release using the new Streaming HTTP transport protocol from the MCP specification. See [GitHub issue #120](https://github.com/Cheffromspace/MCPControl/issues/120)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## References

- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)