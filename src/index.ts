#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import { HttpTransportManager } from './handlers/transports/http.js';

class MCPControlServer {
  private server: McpServer;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  /**
   * HTTP Transport Manager for handling HTTP requests
   */
  private httpTransport?: HttpTransportManager;

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

      // Initialize HTTP transport manager if needed
      if (config.transport === 'http' && config.http) {
        this.httpTransport = new HttpTransportManager();
      }

      this.server = new McpServer({
        name: 'mcp-control',
        version: '0.1.22',
        capabilities: {
          tools: {},
          resources: {},
        },
      });

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
    // Add error handler to process
    process.on('uncaughtException', (error: Error) => {
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(
        `[MCP Error] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    });

    process.on('SIGINT', () => {
      void this.server.close().then(() => process.exit(0));
    });
  }

  /**
   * Start the server with the configured transport
   */
  async run(): Promise<void> {
    const config = loadConfig();

    if (config.transport === 'http' && config.http) {
      // Initialize HTTP transport
      await this.runWithHttpTransport(config);
    } else {
      // Default to stdio transport
      await this.runWithStdioTransport();
    }
  }

  /**
   * Start the server with stdio transport
   */
  private async runWithStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Using process.stderr.write to avoid affecting the JSON-RPC stream
    process.stderr.write(
      `MCP Control server running on stdio (using ${this.provider.constructor.name})\n`,
    );
  }

  /**
   * Start the server with HTTP stream transport
   */
  private async runWithHttpTransport(config: ReturnType<typeof loadConfig>): Promise<void> {
    if (!config.http || !this.httpTransport) {
      throw new Error('HTTP configuration is missing or invalid');
    }

    const { port, path } = config.http;
    const endpoint = path || '/mcp';
    const httpPort = port || 3000;

    // Create and configure the HTTP transport
    const transport = this.httpTransport.createTransport(config.http);

    // Start the HTTP server
    this.httpTransport.startServer(httpPort, endpoint, this.provider.constructor.name);

    // Connect transport to server
    await this.server.connect(transport);
  }
}

const server = new MCPControlServer();
server.run().catch((err) => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(
    `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
  );
});
