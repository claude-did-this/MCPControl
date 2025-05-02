#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import { createHttpServer } from './server.js';
import * as os from 'os';

class MCPControlServer {
  private server: Server;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  /**
   * HTTP server instance if HTTP/SSE is enabled
   */
  private httpServer?: ReturnType<typeof createHttpServer>;

  constructor() {
    try {
      // Load configuration
      const config = loadConfig();

      // Validate configuration
      if (!config || typeof config.provider !== 'string') {
        throw new Error('Invalid configuration: provider property is missing or invalid');
      }

      // Validate that the provider is supported
      const supportedProviders = ['keysender']; // add others as they become available
      if (!supportedProviders.includes(config.provider.toLowerCase())) {
        throw new Error(
          `Unsupported provider: ${config.provider}. Supported providers: ${supportedProviders.join(', ')}`,
        );
      }

      // Create automation provider based on configuration
      this.provider = createAutomationProvider(config.provider);

      this.server = new Server(
        {
          name: 'mcp-control',
          version: '0.1.20',
        },
        {
          capabilities: {
            tools: {},
          },
        },
      );

      this.setupHandlers();
      this.setupErrorHandling();
    } catch (error) {
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `Failed to initialize MCP Control Server: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      // Log additional shutdown information
      process.stderr.write('Server initialization failed. Application will now exit.\n');
      // Exit with non-zero status to indicate error
      process.exit(1);
    }
  }

  private setupHandlers(): void {
    // Set up tools with Zod validation
    setupTools(this.server, this.provider);
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `[MCP Error] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    };

    process.on('SIGINT', () => {
      if (this.httpServer) {
        this.httpServer.httpServer.close();
      }
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    // Determine which transport to use based on environment variables
    // Default to using SSE/HTTP when running in production
    const useSSE =
      process.env.ENABLE_SSE === 'true' ||
      process.env.ENABLE_HTTP === 'true' ||
      process.env.NODE_ENV === 'production' ||
      true; // Always enable HTTP for easier access

    if (useSSE) {
      // Configure HTTP server with SSE transport
      let httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3232;
      if (isNaN(httpPort)) {
        process.stderr.write(
          `Invalid HTTP_PORT value: ${process.env.HTTP_PORT}, using default 3232\n`,
        );
        httpPort = 3232;
      }

      // Start HTTP server with SSE transport - server.ts handles connecting the transport
      this.httpServer = createHttpServer(this.server, httpPort);

      // Set up error handler for HTTP server
      this.httpServer.httpServer.on('error', (err) => {
        process.stderr.write(`Failed to start HTTP server: ${err.message}\n`);
      });

      // Get all network interfaces to display IP addresses
      const networkInterfaces = os.networkInterfaces();

      // Define an interface for IP address info
      interface IpInfo {
        interface: string;
        address: string;
      }

      const ipAddresses: IpInfo[] = [];

      // Collect all IPv4 addresses
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        const interfaces = networkInterfaces[interfaceName];
        interfaces?.forEach((iface) => {
          // Include all IPv4 addresses (including internal ones for WSL)
          // This ensures we show all possible addresses that might work
          // TypeScript doesn't have up-to-date types for os.networkInterfaces()
          // The family property is either 'IPv4' or 'IPv6'
          if ('family' in iface && iface.family === 'IPv4') {
            ipAddresses.push({
              interface: interfaceName,
              address: iface.address,
            });
          }
        });
      });

      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `MCP Control server running (using ${this.provider.constructor.name})\n`,
      );

      // Display URLs for accessing the server
      process.stderr.write(`\nMCP Control Server URLs:\n`);
      process.stderr.write(`  - Local: http://localhost:${httpPort}\n`);

      // Display all network interfaces for easy access
      if (ipAddresses.length > 0) {
        // Group by interface name for cleaner output
        const interfaceGroups: { [key: string]: string[] } = {};

        ipAddresses.forEach((ip) => {
          if (!interfaceGroups[ip.interface]) {
            interfaceGroups[ip.interface] = [];
          }
          interfaceGroups[ip.interface].push(ip.address);
        });

        // Output grouped by interface
        Object.entries(interfaceGroups).forEach(([interfaceName, addresses]) => {
          // Display interface name
          process.stderr.write(`  - ${interfaceName}:\n`);

          // Display each address for this interface
          addresses.forEach((address) => {
            process.stderr.write(`      http://${address}:${httpPort}\n`);
          });
        });
      }

      process.stderr.write(`\nMetrics endpoint: http://localhost:${httpPort}/metrics\n`);
      process.stderr.write(`SSE endpoint: http://localhost:${httpPort}/mcp/sse\n`);
    } else {
      // Use standard stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `MCP Control server running on stdio (using ${this.provider.constructor.name})\n`,
      );
    }
  }
}

const server = new MCPControlServer();
server.run().catch((err) => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(
    `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
  );
});
