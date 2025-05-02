import express from 'express';
import * as http from 'http';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SseTransport } from './transports/sseTransport.js';

/**
 * Maximum number of SSE clients that can connect simultaneously
 * Can be overridden with MAX_SSE_CLIENTS environment variable
 */
const MAX_SSE_CLIENTS = parseInt(process.env.MAX_SSE_CLIENTS || '100', 10);

/**
 * Maximum number of events to buffer per client
 * Can be overridden with MAX_SSE_BUFFER_SIZE environment variable
 */
const MAX_SSE_BUFFER_SIZE = parseInt(process.env.MAX_SSE_BUFFER_SIZE || '100', 10);

/**
 * Creates and configures an HTTP server with SSE transport
 * @param mcpServer The MCP server instance to connect with
 * @param port The port to listen on (default: 3232)
 * @returns Object containing the express app, http server, and transport instances
 */
export function createHttpServer(
  mcpServer: MCPServer,
  port = 3232,
): {
  app: ReturnType<typeof express>;
  httpServer: http.Server;
  sseTransport: SseTransport;
} {
  const app = express();

  // Set up middleware to parse JSON bodies
  app.use(express.json());

  // Explicitly type the app to satisfy ESLint
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const httpServer = http.createServer(app);

  // Initialize SSE transport
  const sseTransport = new SseTransport({
    maxBufferSize: MAX_SSE_BUFFER_SIZE,
    heartbeatInterval: 25000,
  });

  // Attach transport to the Express app
  sseTransport.attach(app);

  // We don't connect the SSE transport directly to the MCP server
  // It works differently than the stdio transport

  // Add client limit enforcement middleware
  app.use('/mcp/sse', (req, res, next) => {
    const clientCount = sseTransport.getClientCount();
    if (clientCount >= MAX_SSE_CLIENTS) {
      res.status(503).json({
        success: false,
        message: `Maximum number of SSE clients (${MAX_SSE_CLIENTS}) reached`,
      });
      return;
    }
    next();
  });

  /**
   * SSE Event Types:
   * The following events are emitted over the SSE connection:
   *
   * 1. mcp.session - Sent when a client connects, contains sessionId
   *    Format: { sessionId: string }
   *
   * 2. mcp.heartbeat - Sent every 25 seconds to keep connections alive
   *    Format: { ts: ISO8601 timestamp }
   *
   * 3. mcp.tool.response - Sent when a tool completes execution
   *    Format: {
   *      id: string,
   *      result: {
   *        success: boolean,
   *        data?: any,
   *        error?: string
   *      }
   *    }
   *
   * 4. mcp.message - Generic MCP messages
   *
   * 5. mcp.notification - Server notifications
   *
   * Clients should handle these events appropriately to maintain
   * synchronization with the MCP Control server state.
   */

  // Prometheus metrics endpoint
  app.get('/metrics', (req, res) => {
    try {
      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(sseTransport.getPrometheusMetrics());
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.status(500).send('Error generating metrics');
    }
  });

  // Start listening
  httpServer.listen(port);

  // Do not log from here - we'll consolidate logging in index.ts

  // Note: Error handling for the HTTP server should be done by the caller
  // This approach is more testable and allows for proper error propagation

  return {
    app,
    httpServer,
    sseTransport,
  };
}
