# MCPControl v0.3.0 Release Notes

## 🚀 Major Changes

### Cross-Platform Support
MCPControl now supports **Windows, macOS, and Linux** by replacing the Windows-only keysender library with nutjs (@nut-tree-fork/libnut).

### Breaking Changes
⚠️ **No npm package** - Users must build from source due to native compilation requirements
⚠️ **Build tools required** - See prerequisites below for your platform

## 📋 Prerequisites

### Windows
- Visual Studio Build Tools with C++ workload
- Python 3.12+
- Node.js 18+ LTS
- node-gyp and cmake-js

### macOS
- Xcode Command Line Tools
- Python 3.12+
- Node.js 18+ LTS
- node-gyp and cmake-js

### Linux
- build-essential
- libx11-dev, libxtst-dev, libpng-dev
- Python 3.12+
- Node.js 18+ LTS
- node-gyp and cmake-js

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/claude-did-this/MCPControl.git
cd MCPControl

# Install dependencies (this will compile nutjs)
npm install

# Build the TypeScript project
npm run build

# Run MCPControl
node build/index.js --sse
```

## ✨ What's New

### Added
- **nutjs provider** - Cross-platform automation support for Windows, macOS, and Linux
- **Multi-platform CI** - GitHub Actions now tests on all three platforms
- **CHANGELOG.md** - Comprehensive change history
- **Type definitions** - Full TypeScript support for @nut-tree-fork/libnut

### Changed
- **Default provider** - Changed from keysender to nutjs
- **Documentation** - Updated to reflect cross-platform support and build requirements
- **Project status** - Clarified that project is not actively developed but accepts PRs

### Removed
- **keysender provider** - Removed Windows-only keysender implementation
- **npm publishing** - Disabled due to native compilation requirements
- **Test scripts** - Removed keysender-specific test utilities

### Fixed
- All TypeScript build errors resolved
- All tests now pass (152/152)
- Async/await issues in screen automation tests
- ESLint errors reduced from 16 to 2

## 🔄 Migration Guide

If you're upgrading from v0.2.x:

1. **Uninstall global package** (if installed via npm)
   ```bash
   npm uninstall -g mcp-control
   ```

2. **Clone and build from source** (see Installation above)

3. **Update environment variables** (if using custom providers)
   ```bash
   # Old
   AUTOMATION_PROVIDER=keysender
   
   # New (default, no need to set)
   AUTOMATION_PROVIDER=nutjs
   ```

## 📊 Provider Compatibility

| Provider | Windows | macOS | Linux |
|----------|---------|-------|-------|
| nutjs (default) | ✅ | ✅ | ✅ |
| autohotkey | ✅ | ❌ | ❌ |
| powershell | ✅ | ❌ | ❌ |
| clipboardy | ✅ | ✅ | ✅ |

## 🐛 Known Issues

- Pre-commit hooks may fail on Windows due to prettier path handling
- Some platform-specific features may have limitations
- Window management features vary by operating system

## 🙏 Acknowledgments

- Thanks to the @nut-tree-fork community for maintaining the libnut fork
- All contributors who submitted PRs and bug reports

## 📝 Notes

- This project is not actively developed but we welcome pull requests
- Response times may be slow as there is no dedicated maintenance team
- For bugs or features, please be prepared to implement fixes yourself via PR

---

**Full Changelog**: [v0.2.0...v0.3.0](https://github.com/claude-did-this/MCPControl/compare/v0.2.0...v0.3.0)