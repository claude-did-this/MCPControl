[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cheffromspace-mcpcontrol-badge.png)](https://mseep.ai/app/cheffromspace-mcpcontrol)

# MCPControl

<p align="center">
  <img src="https://github.com/user-attachments/assets/1c577e56-7b8d-49e9-aaf5-b8550cc6cfc0" alt="MCPControl Logo" width="250">
</p>

<p align="center">
  <a href="https://github.com/Cheffromspace/MCPControl/releases/tag/v0.2.0">
    <img src="https://img.shields.io/badge/release-v0.2.0-blue.svg" alt="Latest Release">
  </a>
</p>

Windows control server for the [Model Context Protocol](https://modelcontextprotocol.io/), providing programmatic control over system operations including mouse, keyboard, window management, and screen capture functionality.

> **Note**: This project currently supports Windows only.

## 🔥 Why MCPControl?

MCPControl bridges the gap between AI models and your desktop, enabling secure, programmatic control of:

- 🖱️ **Mouse movements and clicks**
- ⌨️ **Keyboard input and shortcuts**
- 🪟 **Window management**
- 📸 **Screen capture and analysis**
- 📋 **Clipboard operations**

## 🔌 Quick Start

### Prerequisites

1. **Install Build Tools (including VC++ workload)**
   ```powershell
   # Run as Administrator - may take a few minutes to complete
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

2. **Install Python** (if not already installed)
   ```powershell
   # Install Python (required for node-gyp)
   winget install Python.Python.3.12
   ```

3. **Install Node.js**
   ```powershell
   # Install latest LTS version
   winget install OpenJS.NodeJS
   ```

### Installation

1. **Install MCPControl Package**
   ```powershell
   npm install -g mcp-control
   ```

### Configuration

MCPControl works best in a **virtual machine at 1280x720 resolution** for optimal click accuracy.

Configure your Claude client to connect to MCPControl via SSE transport:

#### Option 1: Direct SSE Connection

For connecting to an MCPControl server running on a VM or remote machine:

```json
{
  "mcpServers": {
    "MCPControl": {
      "transport": "sse",
      "url": "http://192.168.1.100:3232/mcp"
    }
  }
}
```

Replace `192.168.1.100:3232` with your server's IP address and port.

#### Option 2: Local Launch with SSE

To launch MCPControl locally with SSE transport:

```json
{
  "mcpServers": {
    "MCPControl": {
      "command": "mcp-control",
      "args": ["--sse"]
    }
  }
}
```

### Starting the Server

First, start the MCPControl server on your VM or local machine:

```bash
mcp-control --sse
```

The server will display:
- Available network interfaces and their IP addresses
- The port number (default: 3232)
- Connection status messages

### VM Setup Example

1. **Start your Windows VM** with 1280x720 resolution
2. **Install MCPControl** on the VM:
   ```bash
   npm install -g mcp-control
   ```
3. **Run the server** with SSE transport:
   ```bash
   mcp-control --sse
   ```
4. **Note the VM's IP address** (e.g., `192.168.1.100`)
5. **Configure Claude** with the SSE URL:
   ```json
   {
     "mcpServers": {
       "MCPControl": {
         "transport": "sse",
         "url": "http://192.168.1.100:3232/mcp"
       }
     }
   }
   ```
6. **Restart Claude** and MCPControl will appear in your MCP menu!

## 🔧 CLI Options

MCPControl supports several command-line flags for advanced configurations:

```bash
# Run with SSE transport on default port (3232)
mcp-control --sse

# Run with SSE on custom port
mcp-control --sse --port 3000

# Run with HTTPS/TLS (required for production deployments)
mcp-control --sse --https --cert /path/to/cert.pem --key /path/to/key.pem

# Run with HTTPS on custom port
mcp-control --sse --https --port 8443 --cert /path/to/cert.pem --key /path/to/key.pem
```

### Command Line Arguments

- `--sse` - Enable SSE (Server-Sent Events) transport for network access
- `--port [number]` - Specify custom port (default: 3232)
- `--https` - Enable HTTPS/TLS (required for remote deployments per MCP spec)
- `--cert [path]` - Path to TLS certificate file (required with --https)
- `--key [path]` - Path to TLS private key file (required with --https)

### Security Note

According to the MCP specification, HTTPS is **mandatory** for all HTTP-based transports in production environments. When deploying MCPControl for remote access, always use the `--https` flag with valid TLS certificates.

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

<table>
  <tr>
    <td>
      <h3>🪟 Window Management</h3>
      <ul>
        <li>List all windows</li>
        <li>Get active window info</li>
        <li>Focus, resize & reposition</li>
      </ul>
    </td>
    <td>
      <h3>🖱️ Mouse Control</h3>
      <ul>
        <li>Precision movement</li>
        <li>Click & drag operations</li>
        <li>Scrolling & position tracking</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td>
      <h3>⌨️ Keyboard Control</h3>
      <ul>
        <li>Text input & key combos</li>
        <li>Key press/release control</li>
        <li>Hold key functionality</li>
      </ul>
    </td>
    <td>
      <h3>📸 Screen Operations</h3>
      <ul>
        <li>High-quality screenshots</li>
        <li>Screen size detection</li>
        <li>Active window capture</li>
      </ul>
    </td>
  </tr>
</table>

## 🔧 Automation Providers

MCPControl supports multiple automation providers for different use cases:

- **keysender** (default) - Native Windows automation with high reliability
- **powershell** - Windows PowerShell-based automation for simpler operations
- **autohotkey** - AutoHotkey v2 scripting for advanced automation needs

### Provider Configuration

You can configure the automation provider using environment variables:

```bash
# Use a specific provider for all operations
export AUTOMATION_PROVIDER=autohotkey

# Configure AutoHotkey executable path (if not in PATH)
export AUTOHOTKEY_PATH="C:\Program Files\AutoHotkey\v2\AutoHotkey.exe"
```

Or use modular configuration for specific operations:

```bash
# Mix and match providers for different operations
export AUTOMATION_KEYBOARD_PROVIDER=autohotkey
export AUTOMATION_MOUSE_PROVIDER=keysender
export AUTOMATION_SCREEN_PROVIDER=keysender  
export AUTOMATION_CLIPBOARD_PROVIDER=powershell
```

See provider-specific documentation:
- [AutoHotkey Provider](src/providers/autohotkey/README.md)

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

## 🔖 Repository Branches

- **`main`** - Main development branch with the latest features and changes
- **`release`** - Stable release branch that mirrors the latest stable tag (currently v0.2.0)

### Version Installation

You can install specific versions of MCPControl using npm:

```bash
# Install the latest stable release (from release branch)
npm install mcp-control

# Install a specific version
npm install mcp-control@0.1.22
```

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
- MCPControl works best at 1280x720 resolution, single screen. Click accuracy is optimized for this resolution. We're working on an offset/scaling bug and looking for testers or help creating testing tools

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## ⚖️ License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📖 References

- [Model Context Protocol Documentation](https://modelcontextprotocol.github.io/)

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cheffromspace-mcpcontrol-badge.png)](https://mseep.ai/app/cheffromspace-mcpcontrol)

