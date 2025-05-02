# MCPControl

<p align="center">
  <img src="https://raw.githubusercontent.com/Cheffromspace/MCPControl/assets/logo/mcpcontrol-logo.png" alt="MCPControl Logo" width="250">
</p>

Windows control server for the [Model Context Protocol](https://modelcontextprotocol.github.io/), providing programmatic control over system operations including mouse, keyboard, window management, and screen capture functionality.

> **Note**: This project currently supports Windows only.

## 🔥 Why MCPControl?

MCPControl bridges the gap between AI models and your desktop, enabling secure, programmatic control of:

- 🖱️ **Mouse movements and clicks**
- ⌨️ **Keyboard input and shortcuts**
- 🪟 **Window management**
- 📸 **Screen capture and analysis**
- 📋 **Clipboard operations**

## 🚀 Popular Use Cases

### Assisted Automation

- **Application Testing**: Delegate repetitive UI testing to Claude, allowing AI to navigate through applications and report issues
- **Workflow Automation**: Have Claude operate applications on your behalf, handling repetitive tasks while you focus on creative work
- **Form Filling**: Let Claude handle data entry tasks with your supervision

### AI Experimentation

- **AI Gaming**: Watch Claude learn to play simple games through visual feedback
- **Visual Reasoning**: Test Claude's ability to navigate visual interfaces and solve visual puzzles
- **Human-AI Collaboration**: Explore new interaction paradigms where Claude can see your screen and help with complex tasks

### Development and Testing

- **Cross-Application Integration**: Bridge applications that don't normally communicate
- **UI Testing Framework**: Create robust testing scenarios with visual validation
- **Demo Creation**: Automate the creation of product demonstrations

## ⚠️ IMPORTANT DISCLAIMER

**THIS SOFTWARE IS EXPERIMENTAL AND POTENTIALLY DANGEROUS**

By using this software, you acknowledge and accept that:

- Giving AI models direct control over your computer through this tool is inherently risky
- This software can control your mouse, keyboard, and other system functions which could potentially cause unintended consequences
- You are using this software entirely at your own risk
- The creators and contributors of this project accept NO responsibility for any damage, data loss, or other consequences that may arise from using this software
- This tool should only be used in controlled environments with appropriate safety measures in place

**USE AT YOUR OWN RISK**

## 🌟 Features

<p align="center">
  <table>
    <tr>
      <td align="center">
        <h3>🪟 Window Management</h3>
        <ul>
          <li>List all windows</li>
          <li>Get active window info</li>
          <li>Focus, resize & reposition</li>
        </ul>
      </td>
      <td align="center">
        <h3>🖱️ Mouse Control</h3>
        <ul>
          <li>Precision movement</li>
          <li>Click & drag operations</li>
          <li>Scrolling & position tracking</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td align="center">
        <h3>⌨️ Keyboard Control</h3>
        <ul>
          <li>Text input & key combos</li>
          <li>Key press/release control</li>
          <li>Hold key functionality</li>
        </ul>
      </td>
      <td align="center">
        <h3>📸 Screen Operations</h3>
        <ul>
          <li>High-quality screenshots</li>
          <li>Screen size detection</li>
          <li>Active window capture</li>
        </ul>
      </td>
    </tr>
  </table>
</p>

## 🔌 Quick Start

1. **Install Node.js** (if not already installed)
   ```
   # Visit https://nodejs.org and download the latest LTS version
   ```

2. **Configure MCP settings** in your Claude client:

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

3. **Restart your client** and MCPControl will appear in your MCP menu!

## 🧪 Try Our Test Panel

Experience MCPControl's capabilities with our interactive test panel:

1. Clone the repository
2. Run `npm install && npm run build`
3. Launch the test server: `cd test && node test-server.js`
4. Open your browser to the displayed URL
5. In a separate terminal, run MCPControl: `node build/index.js`
6. Connect Claude to MCPControl and ask it to interact with the test panel

## 🛠️ Development Setup

If you're interested in contributing or building from source, please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

### Development Requirements

To build this project for development, you'll need:

1. Windows operating system (required for the keysender dependency)
2. Node.js 18 or later (install using the official Windows installer which includes build tools)
3. npm package manager
4. Native build tools:
   - node-gyp: `npm install -g node-gyp`
   - cmake-js: `npm install -g cmake-js`

The keysender dependency relies on Windows-specific native modules that require these build tools.

## 📋 Project Structure

- `/src`
  - `/handlers` - Request handlers and tool management
  - `/tools` - Core functionality implementations
  - `/types` - TypeScript type definitions
  - `index.ts` - Main application entry point

## 📚 Dependencies

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK for protocol implementation
- [keysender](https://www.npmjs.com/package/keysender) - Windows-only UI automation library
- [clipboardy](https://www.npmjs.com/package/clipboardy) - Clipboard handling
- [sharp](https://www.npmjs.com/package/sharp) - Image processing
- [uuid](https://www.npmjs.com/package/uuid) - UUID generation

## 🚧 Known Limitations

- Window minimize/restore operations are currently unsupported
- Multiple screen functions may not work as expected, depending on setup
- The get_screenshot utility does not work with the VS Code Extension Cline. See [GitHub issue #1865](https://github.com/cline/cline/issues/1865)
- Some operations may require elevated permissions depending on the target application
- Only Windows is supported
- Click accuracy is currently working best at 1280x720 resolution, single screen. We're working on an offset/scaling bug and looking for testers or help creating testing tools

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## ⚖️ License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📖 References

- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)