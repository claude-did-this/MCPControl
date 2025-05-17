#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import { createHttpServer, DEFAULT_PORT } from './server.js';

class MCPControlServer {
  private useSse: boolean;
  private port?: number;
  private server: Server;
  private useHttps: boolean;
  private certPath?: string;
  private keyPath?: string;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  /**
   * HTTP server instance if SSE mode is enabled
   */
  private httpServer?: ReturnType<typeof createHttpServer>;

  constructor(
    useSse: boolean,
    port?: number,
    useHttps = false,
    certPath?: string,
    keyPath?: string,
  ) {
    this.useSse = useSse;
    this.port = port;
    this.useHttps = useHttps;
    this.certPath = certPath;
    this.keyPath = keyPath;
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
      if (this.httpServer) {
        this.httpServer.httpServer.close();
      }
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    // Create the StdioServerTransport for standard MCP communication
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Using process.stderr.write to avoid affecting the JSON-RPC stream
    process.stderr.write(
      `MCP Control server running on stdio (using ${this.provider.constructor.name})\n`,
    );

    // Start HTTP server with SSE support if requested
    if (this.useSse) {
      const port = this.port ?? DEFAULT_PORT;
      try {
        this.httpServer = createHttpServer(
          this.server,
          port,
          this.useHttps,
          this.certPath,
          this.keyPath,
        );
      } catch (error) {
        process.stderr.write(
          `Failed to create ${this.useHttps ? 'HTTPS' : 'HTTP'} server: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        );
        void this.server.close().then(() => process.exit(1));
      }

      // Set up error handler for HTTP server
      this.httpServer.httpServer.on('error', (err) => {
        process.stderr.write(`Failed to start HTTP server: ${err.message}\n`);
      });

      const protocol = this.useHttps ? 'HTTPS' : 'HTTP';
      process.stderr.write(`${protocol}/SSE server enabled on port ${port}\n`);
    }
  }
}

// Parse CLI flags for SSE mode and port
const args = process.argv.slice(2);
const useSse = args.includes('--sse');
const useHttps = args.includes('--https');
let port: number | undefined;
let certPath: string | undefined;
let keyPath: string | undefined;

// Parse port
const portIndex = args.indexOf('--port');
if (portIndex >= 0 && args[portIndex + 1]) {
  const parsed = parseInt(args[portIndex + 1], 10);
  if (!Number.isNaN(parsed)) {
    port = parsed;
  }
}

// Parse certificate and key paths for HTTPS
const certIndex = args.indexOf('--cert');
if (certIndex >= 0 && args[certIndex + 1]) {
  certPath = args[certIndex + 1];
}

const keyIndex = args.indexOf('--key');
if (keyIndex >= 0 && args[keyIndex + 1]) {
  keyPath = args[keyIndex + 1];
}

// Validate HTTPS configuration
if (useHttps && (!certPath || !keyPath)) {
  process.stderr.write('Error: --cert and --key are required when using --https\n');
  process.exit(1);
}

const server = new MCPControlServer(useSse, port, useHttps, certPath, keyPath);
server.run().catch((err) => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(
    `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
  );
});
