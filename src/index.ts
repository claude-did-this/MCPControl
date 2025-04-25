#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import { HttpTransportManager } from './handlers/transports/http.js';
import logger, { requestContext, type LoggerContext } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

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
        // Using logger to avoid affecting the JSON-RPC stream
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          { error: errorMessage },
          `Failed to initialize MCP Control Server: ${errorMessage}`,
        );
        // Log additional shutdown information
        logger.error('Server initialization failed. Application will now exit.');

        // Reject the promise with the error
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private setupHandlers(): void {
    // Set up tools with Zod validation
    // Cast to Server type for compatibility with setupTools
    setupTools(this.server as unknown as Server, this.provider);
  }

  private setupErrorHandling(): void {
    // Log unhandled errors in the process
    process.on('uncaughtException', (error: Error) => {
      // Filter for MCP-specific errors to avoid capturing unrelated errors
      if (error.message.includes('MCP') || error.stack?.includes('mcp-control')) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, `[MCP Server Error] ${errorMessage}`);
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
    // Generate a shutdown ID for correlating shutdown logs
    const shutdownId = uuidv4();

    try {
      // Use the requestContext for shutdown logging
      await requestContext.run({ shutdownId } as LoggerContext, async () => {
        logger.info({ shutdownId }, 'Starting graceful shutdown');

        // Close the MCP server first
        await this.server.close();
        logger.info({ shutdownId }, 'MCP server closed');

        // Close HTTP transport if it exists
        if (this.httpTransport) {
          await this.httpTransport.close();
          logger.info({ shutdownId }, 'HTTP transport closed');
        }

        // Final log message before flushing
        logger.info({ shutdownId }, 'MCP Control server shut down gracefully');

        // Ensure all logs are flushed to destination
        await logger.flush();
      });

      // Exit with success code after flushing logs
      process.exit(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log the error with correlation ID
      await requestContext.run({ shutdownId, error: errorMessage } as LoggerContext, async () => {
        logger.error(`Error during shutdown: ${errorMessage}`);

        // Ensure error logs are flushed
        await logger.flush();
      });

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

    // Using logger to avoid affecting the JSON-RPC stream
    logger.info(
      { provider: this.provider.constructor.name },
      `MCP Control server running on stdio (using ${this.provider.constructor.name})`,
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
    // Using logger to avoid affecting the JSON-RPC stream
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, `Error starting server: ${errorMessage}`);
  }
};

// Start the server
initAndRun().catch(async (err) => {
  const errorMessage = err instanceof Error ? err.message : String(err);

  // Log the fatal error
  logger.fatal({ error: errorMessage }, `Fatal error: ${errorMessage}`);

  // Ensure logs are flushed before exiting
  try {
    await logger.flush();
  } catch (flushError) {
    // If flushing fails, we still need to exit
    console.error('Failed to flush logs:', flushError);
  }

  process.exit(1);
});
