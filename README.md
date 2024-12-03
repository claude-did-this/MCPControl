# NutJS Windows Control

A Windows control server built using [nut.js](https://nutjs.dev/) and Model Context Protocol (MCP), providing programmatic control over Windows system operations including mouse, keyboard, window management, and screen capture functionality.

> **Note**: This project is specifically designed for and tested on Windows. Linux and macOS support is not currently implemented.

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
git clone https://github.com/yourusername/nutjs-windows-control.git
cd nutjs-windows-control
```

2. Build libnut-core from source (required if you don't have a paid NutJS license):
```bash
# Install cmake-js globally (required for building)
npm install -g cmake-js

# Clone libnut repository in a parallel directory
cd ..
git clone https://github.com/nut-tree/libnut.git libnut-core
cd libnut-core

# Install dependencies and build
npm install
cmake-js rebuild

# Return to the main project
cd ../nutjs-windows-control
```

3. Install dependencies:
```bash
npm install
```

4. Build the project:
```bash
npm run build
```

## Usage

### Starting the Server

```bash
npm start
```

For development with auto-recompilation:
```bash
npm run dev
```

### Running Tests

Run all tests:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

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

The project includes comprehensive test coverage:
- Unit tests for all core modules
- Integration tests for cross-module functionality
- Performance testing
- Error handling validation

## Known Limitations

- Window minimize/restore operations are currently unsupported in libnut-core
- Advanced screen information (multiple monitors, DPI settings) is limited to main display
- Some operations may require elevated permissions depending on the target application

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## References

- [NutJS Documentation](https://nutjs.dev/)
- [NutJS GitHub Repository](https://github.com/nut-tree/nut.js)
- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)
