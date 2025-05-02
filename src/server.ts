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
 * Creates and configures an HTTP server with SSE support
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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const httpServer = http.createServer(app);

  // Initialize SSE transport
  const sseTransport = new SseTransport();

  // Attach transport to the Express app
  sseTransport.attach(app);

  // Client limit enforcement
  // We're not returning a Promise in this middleware, so this is safe
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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Send a heartbeat every 25 seconds to keep connections alive
  setInterval(() => {
    sseTransport.emitEvent('mcp.heartbeat', { ts: new Date().toISOString() });
  }, 25000);

  // Start listening
  httpServer.listen(port);

  // Log that the server is running
  process.stderr.write(`HTTP server running on port ${port} with SSE support\n`);

  return {
    app,
    httpServer,
    sseTransport,
  };
}
