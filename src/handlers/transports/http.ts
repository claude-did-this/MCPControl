import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { HttpServerConfig } from '../../config.js';

// Define session type
interface Session {
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * HTTP Transport Manager
 * Responsible for setting up and managing the HTTP transport for MCP
 */
export class HttpTransportManager {
  private app: express.Application;
  private sessions = new Map<string, Session>();
  private cleanupInterval?: NodeJS.Timeout;
  private server?: ReturnType<typeof this.app.listen>;

  constructor() {
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
  }

  /**
   * Create and configure the StreamableHTTPServerTransport
   * @param config HTTP server configuration
   * @returns Configured transport instance
   */
  createTransport(config: HttpServerConfig): StreamableHTTPServerTransport {
    // Set up CORS for HTTP transport
    this.configureCors(config);

    // Set up authentication if API key is provided
    if (config.apiKey) {
      this.configureAuthentication(config.apiKey);
    } else {
      // Log a warning about missing authentication
      process.stderr.write(
        'WARNING: No API key configured for HTTP transport. This is a security risk in production environments.\n',
      );
    }

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
      },
    });

    // Set up Express routes for HTTP
    const endpoint = config.path || '/mcp';

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

    // Start session cleanup interval
    this.startSessionCleanup();

    return httpTransport;
  }

  /**
   * Start the HTTP server on the specified port
   * @param port Port number to listen on
   * @param endpoint MCP API endpoint path
   * @param provider Provider name for logging
   * @returns HTTP server instance
   */
  startServer(
    port: number,
    endpoint: string,
    provider: string,
  ): ReturnType<typeof this.app.listen> {
    // Start the HTTP server
    const httpPort = port || 3000;
    this.server = this.app.listen(httpPort, () => {
      process.stderr.write(
        `MCP Control server running on HTTP at http://localhost:${httpPort}${endpoint} (using ${provider})\n`,
      );
    });

    // Handle server close event to clean up resources
    this.server.on('close', () => {
      this.stopSessionCleanup();
    });

    // Handle process termination signals for clean shutdown
    process.on('SIGINT', () => {
      void this.close();
    });

    process.on('SIGTERM', () => {
      void this.close();
    });

    return this.server;
  }

  /**
   * Close the HTTP transport and clean up all resources
   * This method:
   * 1. Stops the session cleanup interval
   * 2. Closes the HTTP server if it's running
   * 3. Clears the sessions map
   * @returns Promise that resolves when resources are cleaned up
   */
  async close(): Promise<void> {
    // Stop the session cleanup interval
    this.stopSessionCleanup();

    // Clear all sessions
    this.sessions.clear();

    // Close the HTTP server if it exists
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          process.stderr.write('HTTP server closed and all resources cleaned up\n');
          resolve();
        });
      });
    }
  }

  /**
   * Configure CORS settings for the Express app
   * @param config HTTP server configuration
   */
  private configureCors(config: HttpServerConfig): void {
    // Default CORS options - restrictive by default
    const corsOptions = {
      origin: config.cors?.origins || 'localhost',
      methods: config.cors?.methods || ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: config.cors?.headers || [
        'Content-Type',
        'Accept',
        'Authorization',
        'x-api-key',
        'Mcp-Session-Id',
        'Last-Event-ID',
      ],
      exposedHeaders: ['Mcp-Session-Id'],
      credentials: config.cors?.credentials !== undefined ? config.cors.credentials : true,
    };

    // Security validation for CORS settings
    this.validateCorsSettings(corsOptions.origin);

    this.app.use(cors(corsOptions));
  }

  /**
   * Validate CORS settings and display appropriate warnings
   * @param origin CORS origin setting
   */
  private validateCorsSettings(origin: string | string[]): void {
    // Check for wildcard origins
    if (origin === '*') {
      process.stderr.write(
        '\x1b[33m⚠️  SECURITY WARNING: CORS is configured to allow ALL origins (*). \x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   This allows any website to make requests to this API, which is a significant security risk.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Production Recommendation: Specify exact origins using CORS_ORIGINS env variable.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Example: CORS_ORIGINS=https://example.com,https://admin.example.com\x1b[0m\n',
      );
    }

    // Check for overly permissive array of origins
    if (Array.isArray(origin) && origin.includes('*')) {
      process.stderr.write(
        '\x1b[33m⚠️  SECURITY WARNING: CORS includes wildcard (*) in origins list.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Production Recommendation: Remove wildcard and specify exact origins.\x1b[0m\n',
      );
    }

    // Check for non-HTTPS origins in production
    if (process.env.NODE_ENV === 'production') {
      const origins = Array.isArray(origin) ? origin : [origin];
      const nonHttpsOrigins = origins.filter(
        (o) =>
          o !== 'localhost' &&
          o !== '*' &&
          !o.startsWith('https://') &&
          !o.startsWith('chrome-extension://'),
      );

      if (nonHttpsOrigins.length > 0) {
        process.stderr.write(
          '\x1b[33m⚠️  SECURITY WARNING: Non-HTTPS origins detected in production environment:\x1b[0m\n',
        );
        nonHttpsOrigins.forEach((o) => {
          process.stderr.write(`\x1b[33m   - ${o}\x1b[0m\n`);
        });
        process.stderr.write(
          '\x1b[33m   → Recommendation: Use HTTPS for all origins in production.\x1b[0m\n',
        );
      }
    }
  }

  /**
   * Configure authentication middleware for the Express app
   * @param apiKey API key for authentication
   */
  private configureAuthentication(apiKey: string): void {
    // Validate API key strength
    this.validateApiKey(apiKey);

    // Apply authentication to the application
    // The Express 5 typings can be difficult to work with
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    (this.app.use as any)(
      (req: express.Request, res: express.Response, next: express.NextFunction) => {
        // Skip authentication for OPTIONS requests (CORS preflight)
        if (req.method === 'OPTIONS') {
          return next();
        }

        const requestApiKey = req.headers['x-api-key'];

        if (!requestApiKey || requestApiKey !== apiKey) {
          return res.status(401).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Unauthorized - Invalid API key',
            },
            id: null,
          });
        }

        next();
      },
    );
  }

  /**
   * Validate API key strength and display appropriate warnings
   * @param apiKey The API key to validate
   */
  private validateApiKey(apiKey: string): void {
    if (!apiKey) {
      process.stderr.write(
        '\x1b[31m🛑 CRITICAL SECURITY WARNING: API key is empty or undefined.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[31m   Authentication is effectively disabled! Anyone can access and control this computer.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[31m   → Set API_KEY environment variable with a strong secret key.\x1b[0m\n',
      );
      return;
    }

    // Check API key strength
    if (apiKey.length < 16) {
      process.stderr.write(
        '\x1b[33m⚠️  SECURITY WARNING: API key is too short (less than 16 characters).\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Recommendation: Use a longer, randomly generated key.\x1b[0m\n',
      );
    }

    // Check if API key is a common test value
    const commonTestKeys = ['test', 'apikey', 'secret', 'key', '1234', 'password'];
    if (commonTestKeys.some((testKey) => apiKey.toLowerCase().includes(testKey))) {
      process.stderr.write(
        '\x1b[33m⚠️  SECURITY WARNING: API key contains common test values.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Recommendation: Use a random, unique key for production.\x1b[0m\n',
      );
      process.stderr.write(
        '\x1b[33m   → Example: Run "openssl rand -base64 32" to generate a secure key.\x1b[0m\n',
      );
    }
  }

  /**
   * Start a background task to clean up expired sessions
   */
  private startSessionCleanup(): void {
    // Clean up the previous interval if it exists
    this.stopSessionCleanup();

    this.cleanupInterval = setInterval(
      () => {
        const now = new Date();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        for (const [sessionId, session] of this.sessions.entries()) {
          const lastActiveTime = now.getTime() - session.lastActiveAt.getTime();

          if (lastActiveTime > expirationTime) {
            this.sessions.delete(sessionId);
            process.stderr.write(`Session ${sessionId} expired and was removed\n`);
          }
        }
      },
      60 * 60 * 1000,
    ); // Run cleanup every hour
  }

  /**
   * Stop the session cleanup interval
   */
  private stopSessionCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
