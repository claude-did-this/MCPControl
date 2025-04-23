#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import { HttpTransportManager } from './handlers/transports/http.js';

class MCPControlServer {
  private server!: McpServer; // Using definite assignment assertion

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
    // All async initialization is done in the init method
    this.provider = {} as AutomationProvider; // Will be properly initialized in init()
  }

  /**
   * Initialize the server
   * This separate method handles initialization that would otherwise be in the constructor
   * @returns Promise that resolves when initialization is complete
   */
  init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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

        // Read package.json version from environment variable to ensure single source of truth
        const version = process.env.npm_package_version || '0.1.22';

        this.server = new McpServer({
          name: 'mcp-control',
          version,
          capabilities: {
            tools: {},
            resources: {},
          },
        });

        this.setupHandlers();
        this.setupErrorHandling();

        // Promise resolves successfully
        resolve();
      } catch (error) {
        // Using process.stderr.write to avoid affecting the JSON-RPC stream
        process.stderr.write(
          `Failed to initialize MCP Control Server: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        // Log additional shutdown information
        process.stderr.write('Server initialization failed. Application will now exit.\n');

        // Reject the promise with the error
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private setupHandlers(): void {
    // Set up tools with Zod validation
    setupTools(this.server, this.provider);
  }

  private setupErrorHandling(): void {
    // Log unhandled errors in the process
    process.on('uncaughtException', (error: Error) => {
      // Filter for MCP-specific errors to avoid capturing unrelated errors
      if (error.message.includes('MCP') || error.stack?.includes('mcp-control')) {
        process.stderr.write(
          `[MCP Server Error] ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      void this.shutdown();
    });

    process.on('SIGTERM', () => {
      void this.shutdown();
    });
  }

  /**
   * Shut down the server and clean up resources
   */
  private async shutdown(): Promise<void> {
    try {
      // Close the MCP server first
      await this.server.close();

      // Close HTTP transport if it exists
      if (this.httpTransport) {
        await this.httpTransport.close();
      }

      process.stderr.write('MCP Control server shut down gracefully\n');
      process.exit(0);
    } catch (error) {
      process.stderr.write(
        `Error during shutdown: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1);
    }
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

// Create and initialize server asynchronously
const initAndRun = async () => {
  try {
    const server = new MCPControlServer();
    await server.init();
    await server.run();
  } catch (err) {
    // Using process.stderr.write to avoid affecting the JSON-RPC stream
    process.stderr.write(
      `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
};

// Start the server
initAndRun().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
