import express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { networkInterfaces } from 'os';

/**
 * Maximum number of SSE clients that can connect simultaneously
 * Can be overridden with MAX_SSE_CLIENTS environment variable
 */
const MAX_SSE_CLIENTS = parseInt(process.env.MAX_SSE_CLIENTS || '100', 10);

/**
 * Creates and configures an HTTP server with SSE support
 * @param mcpServer The MCP server instance to connect with
 * @param port The port to listen on (default: 3232)
 * @param useHttps Whether to use HTTPS (default: false)
 * @param certPath Path to TLS certificate (only used when useHttps is true)
 * @param keyPath Path to TLS key (only used when useHttps is true)
 * @returns Object containing the express app, http server
 */
export function createHttpServer(
  mcpServer: MCPServer,
  port = 3232,
  useHttps = false,
  certPath?: string,
  keyPath?: string,
): {
  app: ReturnType<typeof express>;
  httpServer: http.Server | https.Server;
} {
  // Create the Express app
  const app = express();

  // Create server based on protocol
  let httpServer: http.Server | https.Server;

  if (useHttps) {
    if (!certPath || !keyPath) {
      throw new Error('Certificate and key paths are required for HTTPS');
    }

    try {
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      httpServer = https.createServer(httpsOptions, app);
    } catch (error) {
      throw new Error(
        `Failed to load TLS certificates: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    httpServer = http.createServer(app);
  }

  // Track active transports by session ID
  const transports: Record<string, SSEServerTransport> = {};
  const endpoint = '/mcp';

  // Client limit enforcement middleware
  app.use(endpoint, (req, res, next) => {
    if (req.method === 'GET' && Object.keys(transports).length >= MAX_SSE_CLIENTS) {
      res.status(503).json({
        success: false,
        message: `Maximum number of SSE clients (${MAX_SSE_CLIENTS}) reached`,
      });
      return;
    }
    next();
  });

  // SSE connection endpoint
  app.get(endpoint, async (req, res) => {
    try {
      const transport = new SSEServerTransport(endpoint, res);
      const sessionId = transport.sessionId;

      // Store transport and set up cleanup
      transports[sessionId] = transport;
      transport.onclose = () => {
        delete transports[sessionId];
      };

      // Connect to MCP server
      await mcpServer.connect(transport);
    } catch (error) {
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

  // HTTP endpoint for bidirectional communication
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

  // Simple metrics endpoint
  app.get('/metrics', (req, res) => {
    try {
      const metrics = [
        '# HELP mcp_sse_connections_active Current number of active SSE connections',
        '# TYPE mcp_sse_connections_active gauge',
        `mcp_sse_connections_active ${Object.keys(transports).length}`,
      ].join('\n');

      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(metrics);
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.status(500).send('Error generating metrics');
    }
  });

  // Start listening
  httpServer.listen(port, '0.0.0.0', () => {
    // Log that the server is running
    const protocol = useHttps ? 'HTTPS' : 'HTTP';
    console.log(`${protocol} server running on port ${port} with SSE support`);

    // Display all available network interfaces
    try {
      const addresses: string[] = [];

      // Collect all non-internal IPv4 addresses
      const interfaces = networkInterfaces();
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

      // Display connection URLs
      const scheme = useHttps ? 'https' : 'http';
      console.log(`Local URL: ${scheme}://localhost:${port}${endpoint}`);
      if (addresses.length > 0) {
        console.log('Available on:');
        addresses.forEach((ip) => {
          console.log(`  ${scheme}://${ip}:${port}${endpoint}`);
        });
      }
    } catch (err) {
      const scheme = useHttps ? 'https' : 'http';
      console.log(`Local URL: ${scheme}://localhost:${port}${endpoint}`);
      console.error('Failed to get network interfaces:', err);
    }
  });

  return {
    app,
    httpServer,
  };
}
