# MCPControl Migration Guide

## Migrating from v0.2.0 to v0.3.0+

This guide helps users upgrade from MCPControl v0.2.0 to the current version (v0.3.0 and later).

### Major Changes

#### 1. Default Provider Changed to nutjs
- **v0.2.0**: Used PowerShell as the default provider (Windows only)
- **v0.3.0+**: Uses nutjs as the default provider (cross-platform support)

#### 2. Cross-Platform Support
- **v0.2.0**: Windows only
- **v0.3.0+**: Windows, macOS, and Linux support

#### 3. New Build Requirements
The new version requires additional build tools due to the nutjs dependency:
- C++ compiler (Visual Studio Build Tools on Windows, Xcode on macOS, build-essential on Linux)
- Python 3.12+
- node-gyp and cmake-js

### Migration Steps

#### Step 1: Backup Your Configuration
If you have custom configurations or environment variables, back them up:
```bash
# Save your current environment variables
echo $AUTOMATION_PROVIDER > provider_backup.txt
```

#### Step 2: Uninstall Old Version
Remove the old installation:
```bash
# If installed globally
npm uninstall -g mcp-control

# If cloned locally
rm -rf MCPControl
```

#### Step 3: Install Prerequisites
Follow the platform-specific prerequisites in the README:
- Windows: Visual Studio Build Tools, Python, Node.js
- macOS: Xcode Command Line Tools, Python, Node.js
- Linux: build-essential, X11 libraries, Python, Node.js

#### Step 4: Build from Source
```bash
# Clone the new version
git clone https://github.com/claude-did-this/MCPControl.git
cd MCPControl

# Install dependencies (this compiles nutjs)
npm install

# Build the project
npm run build
```

#### Step 5: Update Your Configuration

##### Provider Configuration
If you want to continue using PowerShell (Windows only):
```bash
export AUTOMATION_PROVIDER=powershell
```

Or use the new modular configuration:
```bash
export AUTOMATION_KEYBOARD_PROVIDER=autohotkey
export AUTOMATION_MOUSE_PROVIDER=nutjs
export AUTOMATION_SCREEN_PROVIDER=nutjs
export AUTOMATION_CLIPBOARD_PROVIDER=powershell
```

##### Claude Configuration
The SSE configuration remains the same:
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

### Breaking Changes

#### 1. AutoHotkey v2 Required
If using the AutoHotkey provider:
- **v0.2.0**: Supported AutoHotkey v1
- **v0.3.0+**: Requires AutoHotkey v2

#### 2. API Response Format
Some error responses have changed format:
- **v0.2.0**: Used `error` field for error messages
- **v0.3.0+**: Uses consistent `message` field for all responses

#### 3. New Tool Names
Some tools have been renamed for clarity:
- No changes to tool names in this version

### New Features in v0.3.0+

1. **Cross-platform support** via nutjs provider
2. **Modular provider system** - mix and match providers
3. **Better error handling** with Zod validation
4. **HTTPS/TLS support** for secure connections
5. **Improved screenshot options** for AI optimization

### Troubleshooting

#### Build Fails on Windows
Ensure Visual Studio Build Tools are installed with C++ workload:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

#### Build Fails on macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

#### Build Fails on Linux
Install required X11 development libraries:
```bash
# Ubuntu/Debian
sudo apt-get install -y libx11-dev libxkbfile-dev libxtst-dev libpng++-dev
```

#### Provider Not Found
Ensure the provider name is lowercase:
```bash
# Correct
export AUTOMATION_PROVIDER=nutjs

# Incorrect
export AUTOMATION_PROVIDER=NutJS
```

### Getting Help

If you encounter issues during migration:
1. Check the [GitHub Issues](https://github.com/claude-did-this/MCPControl/issues)
2. Review the build logs for specific error messages
3. Ensure all prerequisites are installed correctly
4. Try building with verbose logging: `npm install --verbose`