# NutJS Windows Control

A Windows control server built using [nut.js](https://nutjs.dev/) and Model Context Protocol (MCP), providing programmatic control over Windows system operations including mouse, keyboard, window management, and screen capture functionality.

> **Note**: While this project may work on Linux and macOS, it has only been tested on Windows. Community feedback on cross-platform compatibility is welcome.

## ⚠️ IMPORTANT DISCLAIMER

**THIS SOFTWARE IS EXPERIMENTAL AND POTENTIALLY DANGEROUS**

By using this software, you acknowledge and accept that:

- Giving AI models direct control over your computer through this tool is inherently risky
- This software can control your mouse, keyboard, and other system functions which could potentially cause unintended consequences
- You are using this software entirely at your own risk
- The creators and contributors of this project accept NO responsibility for any damage, data loss, or other consequences that may arise from using this software
- This tool should only be used in controlled environments with appropriate safety measures in place

**USE AT YOUR OWN RISK**

## MCP Tools and Resources

This server provides the following MCP tools for system control:

### Mouse Control Tools
- `move_mouse` - Move the mouse cursor to specific coordinates
- `click_mouse` - Click the mouse at the current position
- `click_at` - Move mouse to coordinates, click, then return to original position
- `drag_mouse` - Drag the mouse from one position to another
- `set_mouse_speed` - Set the mouse movement speed
- `scroll_mouse` - Scroll the mouse wheel up or down

### Keyboard Control Tools
- `type_text` - Type text using the keyboard
- `press_key` - Press a specific keyboard key
- `hold_key` - Hold or release a keyboard key with optional duration
- `press_key_combination` - Press multiple keys simultaneously

### Window Management Tools
- `get_active_window` - Get information about the currently active window
- `list_windows` - Get a list of all visible windows
- `focus_window` - Focus a specific window by its title
- `resize_window` - Resize a specific window
- `reposition_window` - Move a window to new coordinates

### Screen and Clipboard Tools
- `get_screen_size` - Get the screen dimensions
- `get_screenshot` - Take a screenshot with configurable options
- `get_cursor_position` - Get the current cursor position
- `get_clipboard_content` - Get clipboard text content
- `set_clipboard_content` - Set clipboard text content
- `has_clipboard_text` - Check if clipboard contains text
- `clear_clipboard` - Clear the clipboard

### Direct Resources
- `screen://current` - The current screen display
- `screen://size` - The current screen dimensions
- `cursor://position` - Current cursor coordinates
- `window://active` - Information about the currently active window
- `window://list` - List of all visible windows

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
git clone https://github.com/Cheffromspace/nutjs-windows-control.git
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

## Development

### Available Scripts

- `npm run build` - Build the TypeScript project
- `npm start` - Start the MCP server
- `npm run dev` - Watch mode for development
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checks
- `npm run ci` - Run all checks (types, lint, format, tests)

### Development Tools

- **TypeScript Configuration**
  - Strict type checking enabled
  - Comprehensive error detection
  - Source maps for debugging
  - Path aliases for clean imports

- **Code Quality**
  - ESLint with strict TypeScript rules
  - Prettier for consistent formatting
  - Automated PR checks
  - Test coverage requirements (80%)

- **Static Analysis**
  - CodeQL security scanning
  - Dependency vulnerability checks
  - Type safety enforcement
  - Unused code detection

### Development Workflow

1. Start the development server:
```bash
npm run dev
```
This will watch for changes and automatically rebuild the project.

2. In a separate terminal, start the MCP server:
```bash
npm start
```

3. Make changes to the source code in the `/src` directory.

4. Run tests to ensure your changes haven't broken anything:
```bash
npm test
```

### Testing

The project uses Vitest for testing. Tests are located alongside their implementation files with a `.test.ts` suffix.

Run tests:
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

### Troubleshooting

Common issues and solutions:

1. **Permission Errors**
   - Ensure you're running with appropriate permissions for system control
   - Some applications may require elevated privileges
   - Check Windows UAC settings if having issues with admin applications

2. **Build Issues**
   - Make sure libnut-core is built correctly in the parallel directory
   - Check that all dependencies are installed (`npm install`)
   - Clear the build directory and rebuild if seeing strange behavior

3. **Mouse/Keyboard Control Issues**
   - Verify no other applications are capturing input
   - Check screen scaling settings in Windows
   - Ensure coordinates are within screen bounds

4. **Window Management Issues**
   - Some windows may not respond to management commands due to system restrictions
   - Verify window titles exactly match when using focus/resize operations
   - Check if target application has special window handling

### Security Considerations

When developing with this server:

1. **Input Validation**
   - Always validate coordinates before mouse movements
   - Verify window titles and paths
   - Sanitize any text input for keyboard operations

2. **Error Handling**
   - Implement proper error handling for all operations
   - Consider fail-safes for critical operations
   - Log important events for debugging

3. **Resource Management**
   - Clean up resources after operations
   - Implement timeouts for long-running operations
   - Monitor system resource usage

4. **Access Control**
   - Consider implementing operation limits
   - Add validation for sensitive operations
   - Log security-relevant events

## MCP Server Configuration

To use this project with Claude, add the following configuration to your MCP servers:

```json
{
  "mcpServers": {
    "windows-control": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "[INSTALL LOCATION]\\nutjs-windows-control\\build\\index.js"
      ]
    }
  }
}
```

After configuring your MCP server, restart Claude to see the windows-control service in the menu.

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

## Testing and Quality Assurance

### Unit Testing
- Comprehensive test suite using Vitest
- Coverage requirements:
  - 80% line coverage
  - 80% function coverage
  - 70% branch coverage
  - 80% statement coverage
- Tests co-located with implementation files

### Continuous Integration
- Automated GitHub Actions workflow
- Type checking and linting
- Security vulnerability scanning
- Test coverage verification
- CodeQL analysis for TypeScript
- Dependabot updates with smart grouping

### Planned Test Areas
- Integration tests for cross-module functionality
- Performance testing and benchmarking
- Error handling validation
- State management testing
- Focus and input handling tests

## Known Limitations

### Core Limitations
- Window minimize/restore operations are currently unsupported in libnut-core
- Advanced screen information (multiple monitors, DPI settings) is limited to main display
- Some operations may require elevated permissions depending on the target application
- Cross-platform support (Linux/macOS) is untested

### Input and Focus Management
- Split input situations (e.g., approval dialogs) can affect window focus and mouse position
- Window focus changes during operations may interrupt workflow
- Need for state preservation during interrupted operations
- Potential race conditions in multi-step operations

### Remote Control
- Currently limited to local machine operations
- No built-in network communication layer
- Remote host API implementation needed for cross-machine control

### Technical Details
- **Screen Operations**
  - Only main display size and capture are supported
  - No built-in support for secondary monitors
  - Would require implementing platform-specific APIs:
    - Windows: EnumDisplayMonitors()
    - Linux: XRandR extension
    - macOS: NSScreen API

## Development Tools

### Static Analysis
- ESLint configuration for TypeScript
- Prettier for code formatting
- audit-ci for dependency security scanning
- TypeScript strict mode enabled
- Vitest for testing with coverage reporting

### Code Quality
- Automated PR checks for:
  - Type checking
  - Linting
  - Test coverage
  - Security vulnerabilities
  - Build verification

## Roadmap

### In Progress 🔄
- State management for interrupted operations
- Focus tracking and restoration
- Remote control API design
- Performance monitoring tools
- Error handling improvements

### Upcoming Features
- Remote machine control capabilities
  - REST API for remote host communication
  - Secure credential management
  - Cross-machine operation coordination
- Enhanced state management
  - Window focus preservation
  - Mouse position tracking
  - Operation queuing system
- UI element finding capabilities
- Comprehensive integration test suite
- Security test implementation
- Performance test suite

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
