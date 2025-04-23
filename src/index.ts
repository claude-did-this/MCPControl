#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

class MCPControlServer {
  private server: McpServer;
  private app: express.Application | undefined;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  /**
   * Active user sessions for the HTTP transport
   */
  private sessions = new Map<string, {
    id: string;
    createdAt: Date;
    lastActiveAt: Date;
  }>();

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

      // If using HTTP transport, initialize Express app
      if (config.transport === 'http' && config.http) {
        this.app = express();
        this.app.use(express.json());
        
        // Set up CORS for HTTP transport
        const corsOptions = {
          origin: config.http.cors?.origins || '*',
          methods: config.http.cors?.methods || ['GET', 'POST', 'DELETE', 'OPTIONS'],
          allowedHeaders: config.http.cors?.headers || [
            'Content-Type', 
            'Accept', 
            'Authorization', 
            'x-api-key', 
            'Mcp-Session-Id', 
            'Last-Event-ID'
          ],
          exposedHeaders: ['Mcp-Session-Id'],
          credentials: config.http.cors?.credentials !== undefined ? config.http.cors.credentials : true
        };
        
        this.app.use(cors(corsOptions));
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
    if (!config.http || !this.app) {
      throw new Error('HTTP configuration is missing or invalid');
    }
    
    const { port, path } = config.http;
    
    // Create HTTP stream transport with session management
    const httpTransport = new StreamableHTTPServerTransport({
      // Generate a session ID
      sessionIdGenerator: () => {
        const sessionId = uuidv4();
        const session = {
          id: sessionId,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        };
        
        this.sessions.set(sessionId, session);
        return sessionId;
      },
      
      // Configure session initialization handler
      onsessioninitialized: (sessionId: string) => {
        process.stderr.write(`Session initialized with ID: ${sessionId}\n`);
      }
    });
    
    // Set up Express routes for HTTP
    if (this.app) {
      // Create endpoint
      const endpoint = path || '/mcp';
      
      // Handle POST requests
      this.app.post(endpoint, async (req, res) => {
        try {
          await httpTransport.handleRequest(req, res, req.body);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          process.stderr.write(`Error handling POST request: ${errorMessage}\n`);
          
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: null,
            });
          }
        }
      });
      
      // Handle GET requests for SSE streaming
      this.app.get(endpoint, async (req, res) => {
        try {
          await httpTransport.handleRequest(req, res);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          process.stderr.write(`Error handling GET request: ${errorMessage}\n`);
          
          if (!res.headersSent) {
            res.status(500).send('Internal server error');
          }
        }
      });
      
      // Handle DELETE requests for session termination
      this.app.delete(endpoint, async (req, res) => {
        try {
          await httpTransport.handleRequest(req, res);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          process.stderr.write(`Error handling DELETE request: ${errorMessage}\n`);
          
          if (!res.headersSent) {
            res.status(500).send('Error closing session');
          }
        }
      });
      
      // Start the HTTP server
      const httpPort = port || 3000;
      const server = this.app.listen(httpPort, () => {
        process.stderr.write(
          `MCP Control server running on HTTP at http://localhost:${httpPort}${endpoint} (using ${this.provider.constructor.name})\n`,
        );
      });
      
      // Handle server shutdown
      server.on('close', () => {
        // Close the transport
        void httpTransport.close();
      });
    }
    
    // Connect transport to server
    await this.server.connect(httpTransport);
    
    // Start session cleanup interval
    this.startSessionCleanup();
  }

  /**
   * Start a background task to clean up expired sessions
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      for (const [sessionId, session] of this.sessions.entries()) {
        const lastActiveTime = now.getTime() - session.lastActiveAt.getTime();
        
        if (lastActiveTime > expirationTime) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000); // Run cleanup every hour
  }
}

const server = new MCPControlServer();
server.run().catch((err) => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(
    `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
  );
});
