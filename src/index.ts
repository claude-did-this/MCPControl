#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { setupTools } from './handlers/tools.js';
import { loadConfig } from './config.js';
import { createAutomationProvider } from './providers/factory.js';
import { AutomationProvider } from './interfaces/provider.js';

class MCPControlServer {
  private server: Server;

  /**
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

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
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Using process.stderr.write to avoid affecting the JSON-RPC stream
    process.stderr.write(
      `MCP Control server running on stdio (using ${this.provider.constructor.name})\n`,
    );
  }
}

// Choose transport based on command-line argument
const args = process.argv.slice(2);
const firstArg = args[0];
const port = firstArg ? parseInt(firstArg, 10) : NaN;

if (!isNaN(port)) {
  // HTTP+SSE transport mode
  const app = express();
  const transports: { sessionId: string; response: express.Response }[] = [];

  app.get('/sse', (req, res) => {
    process.stderr.write('Got new SSE connection\n');

    // Set SSE headers
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders(); // send headers right away

    // Suggest client reconnection time
    res.write('retry: 3000\n\n');

    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2, 15);

    // Store the response object for later use
    transports.push({ sessionId, response: res });

    // Send initial event with session ID
    res.write(`event:mcp.connect\ndata:{"sessionId":"${sessionId}"}\n\n`);

    // Clean up when connection closes
    req.on('close', () => {
      const idx = transports.findIndex((t) => t.sessionId === sessionId);
      if (idx >= 0) transports.splice(idx, 1);
      process.stderr.write(`SSE connection closed (${sessionId})\n`);
    });

    // Set up a new server instance for this connection
    const serverInstance = new Server(
      { name: 'mcp-control', version: '0.1.20' },
      { capabilities: { tools: {} } },
    );

    // Set up provider and tools
    const cfg = loadConfig();
    const provider = createAutomationProvider(cfg.provider);
    setupTools(serverInstance, provider);

    // Set up error handler
    serverInstance.onerror = (error) => {
      process.stderr.write(
        `[MCP Error] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    };
  });

  // Handle incoming messages
  app.post('/message', express.json(), (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.find((t) => t.sessionId === sessionId);

    if (!transport) {
      res.status(404).send('Session not found');
      return;
    }

    try {
      // Process the message (would ideally be handled by SSEServerTransport's handlePostMessage)
      // For now, just echo back the message as a response
      transport.response.write(`event:mcp.response\ndata:${JSON.stringify(req.body)}\n\n`);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Start the server
  const httpServer = app.listen(port, () => {
    process.stderr.write(
      `MCP Control server running on http://localhost:${port}/sse (using HTTP+SSE)\n`,
    );
  });

  // Send heartbeat every 25 seconds to all connected clients
  setInterval(() => {
    const heartbeat = `event:mcp.heartbeat\ndata:${JSON.stringify({ ts: new Date().toISOString() })}\n\n`;
    transports.forEach((t) => {
      try {
        t.response.write(heartbeat);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // If there's an error, the client will be removed on the next request
      }
    });
  }, 25000);

  // Handle SIGINT for clean shutdown
  process.on('SIGINT', () => {
    httpServer.close();
    process.exit(0);
  });
} else {
  // stdio transport mode
  const server = new MCPControlServer();
  server.run().catch((err) => {
    process.stderr.write(
      `Error starting server: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  });
}
