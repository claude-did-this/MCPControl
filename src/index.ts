#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';

class MCPControlServer {
  private useSse: boolean;
  private port?: number;
  private server: Server;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  constructor(useSse: boolean, port?: number) {
    this.useSse = useSse;
    this.port = port;
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
          version: '0.1.21-alpha.2',
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
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    if (this.useSse) {
      const app = express();
      app.use(express.json());

      const transports: Record<string, SSEServerTransport> = {};
      const endpoint = '/mcp';

      app.get(endpoint, async (req, res) => {
        try {
          const transport = new SSEServerTransport(endpoint, res);
          const sessionId = transport.sessionId;
          transports[sessionId] = transport;
          transport.onclose = () => {
            delete transports[sessionId];
          };
          await this.server.connect(transport);
        } catch (error) {
          // TODO: Fix linter error - Invalid type "unknown" of template literal expression
          console.error(
            `[MCP SSE] Error establishing SSE stream: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          if (!res.headersSent) {
            res.status(500).send('Error establishing SSE stream');
          }
        }
      });

      app.post(endpoint, async (req, res) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
          res.status(400).send('Missing sessionId parameter');
          return;
        }
        const transport = transports[sessionId];
        if (!transport) {
          res.status(404).send('Session not found');
          return;
        }
        try {
          await transport.handlePostMessage(req, res, req.body);
        } catch (error) {
          // TODO: Fix linter error - Invalid type "unknown" of template literal expression
          console.error(
            `[MCP SSE] Error handling request: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          if (!res.headersSent) {
            res.status(500).send('Error handling request');
          }
        }
      });

      const port = this.port ?? 3000;
      app.listen(port, '0.0.0.0', () => {
        // Get network interfaces to display available IP addresses
        import('os')
          .then((os) => {
            const addresses: string[] = [];

            // Collect all non-internal IPv4 addresses
            const interfaces = os.networkInterfaces();
            Object.keys(interfaces).forEach((ifaceName) => {
              const iface = interfaces[ifaceName];
              if (iface) {
                iface.forEach((details) => {
                  if (details.family === 'IPv4' && !details.internal) {
                    addresses.push(details.address);
                  }
                });
              }
            });

            console.log(
              `MCP Control server running in SSE mode on port ${port}, bound to 0.0.0.0 (using ${
                this.provider.constructor.name
              })`,
            );

            // Display connection URLs
            console.log(`Local URL: http://localhost:${port}/mcp`);
            if (addresses.length > 0) {
              console.log('Available on:');
              addresses.forEach((ip) => {
                console.log(`  http://${ip}:${port}/mcp`);
              });
            }
          })
          .catch((err) => {
            console.log(
              `MCP Control server running in SSE mode on port ${port}, bound to 0.0.0.0 (using ${
                this.provider.constructor.name
              })`,
            );
            console.log(`Local URL: http://localhost:${port}/mcp`);
            console.error('Failed to get network interfaces:', err);
          });
      });
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `MCP Control server running on stdio (using ${this.provider.constructor.name})\n`,
      );
    }
  }
}

// Parse CLI flags for SSE mode and port
const args = process.argv.slice(2);
const useSse = args.includes('--sse');
let port: number | undefined;
const portIndex = args.indexOf('--port');
if (portIndex >= 0 && args[portIndex + 1]) {
  const parsed = parseInt(args[portIndex + 1], 10);
  if (!Number.isNaN(parsed)) {
    port = parsed;
  }
}
const server = new MCPControlServer(useSse, port);
server.run().catch((err) => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(
    `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
  );
});
