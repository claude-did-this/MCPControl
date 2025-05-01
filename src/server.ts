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
  // Explicitly type the app to satisfy ESLint
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const httpServer = http.createServer(app);

  // Initialize SSE transport
  const sseTransport = new SseTransport({
    maxBufferSize: 100,
    heartbeatInterval: 25000,
  });

  // Attach transport to the Express app
  sseTransport.attach(app);

  // Since the MCP Server doesn't have a native event system that we can listen to,
  // we'll use manual emit handling through our transport logic.
  // The actual emission will happen elsewhere in the codebase where tool responses are processed.

  // Send a heartbeat every 25 seconds to keep connections alive
  setInterval(() => {
    sseTransport.emitEvent('mcp.heartbeat', { ts: new Date().toISOString() });
  }, 25000);

  // Client limit enforcement
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
