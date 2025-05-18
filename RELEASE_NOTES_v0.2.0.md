# Release Notes v0.2.0

## 🎉 Major Features

### SSE Transport Now Officially Supported
- Full implementation of Server-Sent Events (SSE) transport for network access
- Built using the MCP SDK transport layer for improved reliability
- HTTP/HTTPS server integration for secure connections
- Configurable port settings (default: 3232)

### HTTPS/TLS Support
- Added secure TLS/SSL support for production deployments
- New CLI flags: `--https`, `--cert`, and `--key`
- Certificate validation for enhanced security
- Meets MCP specification requirements for secure remote access

### Improved Documentation
- Added comprehensive Quick Start guide with build tools setup
- Enhanced installation instructions for Windows users
- Clear prerequisites including VC++ workload requirements
- Better guidance for Python and Node.js installation

## 🚀 Enhancements

### Infrastructure Improvements
- Optimized build process with npm ci and caching
- Standardized default port (3232) across entire codebase
- Removed unused dependencies (express, jimp, mcp-control)
- Improved GitHub Actions with better error handling

### Testing Framework
- Added end-to-end testing suite for integration testing
- Better test coverage for SSE transport features
- Enhanced CI/CD pipeline reliability

### Developer Experience
- Simplified SSE implementation using SDK transport
- Better error handling for client connections
- Buffer management improvements
- Platform-specific path fixes

## 🔧 CLI Updates

New command line options:
```bash
# Run with SSE transport
mcp-control --sse

# Run with HTTPS/TLS
mcp-control --sse --https --cert /path/to/cert.pem --key /path/to/key.pem

# Custom port
mcp-control --sse --port 3000
```

## 📦 Dependency Updates

- Updated `@modelcontextprotocol/sdk` to latest version
- Bumped TypeScript ESLint packages to v8.32.0+
- Updated `zod` to v3.24.4
- Various dev dependency updates for security

## 📚 Documentation

- Added SSE transport documentation
- Updated README with release badges
- Improved branch structure documentation
- Added build tools setup instructions
- Enhanced security guidelines

## 🐛 Bug Fixes

- Fixed TypeScript errors related to HTTP server usage
- Resolved client error handling in SSE transport
- Corrected platform-specific path issues
- Fixed npm ci error handling in build scripts

## ⚠️ Breaking Changes

- SSE is now the recommended transport method
- HTTPS is required for production deployments per MCP spec
- Some internal API changes for transport handling

## 🔐 Security

- Added proper TLS certificate validation
- Implemented security options for HTTPS connections
- Updated dependencies to address known vulnerabilities

## 📈 Migration Guide

To upgrade from v0.1.x to v0.2.0:

1. Update your Claude client configuration to use SSE transport:
```json
{
  "mcpServers": {
    "MCPControl": {
      "command": "mcp-control",
      "args": ["--transport", "sse"]
    }
  }
}
```

2. For production deployments, use HTTPS:
```bash
mcp-control --sse --https --cert cert.pem --key key.pem
```

3. Ensure you have the latest build tools installed as per the Quick Start guide

## 👥 Contributors

Special thanks to all contributors who made this release possible, including:
- @Cheffromspace for SSE transport and HTTPS implementation
- @lwsinclair for adding the MseeP.ai security badge
- All the community members who reported issues and provided feedback

## 🔮 What's Next

- Multi-monitor support improvements
- Enhanced click accuracy at different resolutions
- Additional transport options
- Performance optimizations

---

Thank you for using MCPControl! We're excited to bring you these improvements and look forward to your feedback.