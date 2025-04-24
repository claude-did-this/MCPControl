import {
  StreamableHTTPServerTransport,
  type EventStore,
  type StreamId,
  type EventId,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { HttpServerConfig } from '../../config.js';
import logger, { baseLogger, requestContext, type LoggerContext } from '../../logger.js';
import pinoHttp from 'pino-http';

// Define session type
interface Session {
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * In-memory implementation of EventStore for SSE resumability
 *
 * This class implements the EventStore interface required by StreamableHTTPServerTransport to enable
 * resumable Server-Sent Events (SSE) streams. It allows clients to reconnect and resume streaming
 * from where they left off by providing the Last-Event-ID header.
 *
 * Features:
 * - Stores events in memory for each active session
 * - Manages event lifecycle with automatic cleanup of old events
 * - Provides methods to retrieve events after a specific ID (for resuming connections)
 * - Limits the number of events stored per session to prevent memory leaks
 * - Automatically expires old events based on configurable timeouts
 *
 * How it works with Last-Event-ID:
 * 1. Client connects to SSE stream endpoint
 * 2. Server sends events with unique IDs
 * 3. If connection drops, client reconnects with Last-Event-ID header
 * 4. Server retrieves missed events from EventStore
 * 5. Server sends missed events to client before resuming normal operation
 */
/**
 * Structure for stored events in memory that tracks both the stream ID and the message
 */
interface StoredEvent {
  streamId: StreamId; // ID of the stream the event belongs to
  message: JSONRPCMessage; // The original JSON-RPC message
  timestamp: number; // When the event was created
}

/**
 * In-memory implementation of EventStore for SSE resumability
 *
 * This class implements the EventStore interface required by StreamableHTTPServerTransport to enable
 * resumable Server-Sent Events (SSE) streams. It allows clients to reconnect and resume streaming
 * from where they left off by providing the Last-Event-ID header.
 */
export class InMemoryEventStore implements EventStore {
  // Map of eventId -> StoredEvent
  private events = new Map<string, StoredEvent>();
  // Maximum number of events to keep overall
  private maxEvents: number;
  // Maximum age of events to keep in milliseconds
  private maxEventAge: number;
  // Cleanup interval reference
  private cleanupInterval?: NodeJS.Timeout;
  // Event queue for handling concurrent operations
  private eventQueue: Promise<unknown> = Promise.resolve();
  // Memory usage tracking
  private lastMemoryReport = 0;
  private memoryReportInterval = 15 * 60 * 1000; // 15 minutes

  constructor(maxEvents = 10000, maxEventAgeInMinutes = 30) {
    this.maxEvents = maxEvents;
    this.maxEventAge = maxEventAgeInMinutes * 60 * 1000;
    // Start background cleanup task
    this.cleanupInterval = setInterval(() => this.cleanupOldEvents(), 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Store an event for later retrieval
   * @param streamId ID of the stream the event belongs to
   * @param message The JSON-RPC message to store
   * @returns The generated event ID for the stored event
   */
  async storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId> {
    // Add this operation to our queue and wait for our turn
    return new Promise<EventId>((resolve, reject) => {
      this.eventQueue = this.eventQueue
        .then(() => {
          try {
            // Generate a unique event ID that includes the stream ID for easy lookup
            const timestamp = Date.now();
            const eventId = `${streamId}-${timestamp}-${Math.floor(Math.random() * 10000)}`;

            // Create context with event ID for correlated logging
            requestContext.run({ eventId, sessionId: streamId }, () => {
              // Log the stored event with correlation ID
              logger.debug(
                {
                  eventId,
                  streamId,
                  messageId:
                    typeof message === 'object' && message !== null && 'id' in message
                      ? message.id
                      : undefined,
                  method:
                    typeof message === 'object' && message !== null && 'method' in message
                      ? message.method
                      : undefined,
                },
                `Storing event ${eventId} for stream ${streamId}`,
              );

              // Store the event with its stream ID and timestamp
              this.events.set(eventId, {
                streamId,
                message,
                timestamp,
              });

              // Prune old events if we're over the limit
              if (this.events.size > this.maxEvents) {
                this.pruneOldestEvents(this.events.size - this.maxEvents);
              }

              // Report memory usage periodically
              const now = Date.now();
              if (now - this.lastMemoryReport > this.memoryReportInterval) {
                this.reportMemoryUsage();
                this.lastMemoryReport = now;
              }

              resolve(eventId);
            });
          } catch (error) {
            // Ensure we reject with an Error object
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        })
        .catch((error) => {
          // Ensure we reject with an Error object
          reject(error instanceof Error ? error : new Error(String(error)));
        }); // Make sure we propagate any errors in the chain
    });
  }

  /**
   * Report memory usage of the event store
   */
  private reportMemoryUsage(): void {
    try {
      // Get process memory usage
      const memoryUsage = process.memoryUsage();
      const eventCount = this.events.size;

      logger.info(
        {
          eventCount,
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        `EventStore memory stats: ${eventCount} events, RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, `Failed to report memory usage: ${errorMessage}`);
    }
  }

  /**
   * Replays events that occurred after a specific event ID
   * @param lastEventId The ID of the last event the client received
   * @param options.send A function to send each replayed event
   * @returns The stream ID that events were replayed from
   */
  async replayEventsAfter(
    lastEventId: EventId,
    {
      send,
    }: {
      send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
    },
  ): Promise<StreamId> {
    // Create a replay correlation ID to trace this entire replay operation
    const replayId = uuidv4();

    // Run in context of this replay operation
    return await requestContext.run({ replayId } as LoggerContext, async () => {
      // If no lastEventId, nothing to replay
      if (!lastEventId) {
        logger.debug({ replayId }, 'No lastEventId provided, nothing to replay');
        return '';
      }

      // Get the stream ID from the event ID
      const streamId = this.getStreamIdFromEventId(lastEventId);
      if (!streamId) {
        logger.warn(
          { lastEventId, replayId },
          `Unable to determine stream ID from event ID: ${lastEventId}`,
        );
        return '';
      }

      // Check if the event exists in our store
      if (!this.events.has(lastEventId)) {
        logger.warn(
          { lastEventId, streamId, replayId },
          `Event ${lastEventId} not found in event store`,
        );
        return '';
      }

      try {
        // Find the timestamp of the last event to determine when to start replaying
        const lastEvent = this.events.get(lastEventId);
        if (!lastEvent) {
          logger.warn(
            { lastEventId, streamId, replayId },
            `Event ${lastEventId} found in map but could not be retrieved`,
          );
          return '';
        }

        const lastEventTimestamp = lastEvent.timestamp;

        // Get all events for this stream that are newer than the last event
        // This ensures we don't miss any events and maintains strict chronological order
        const eventsToReplay = Array.from(this.events.entries())
          .filter(
            ([_eventId, event]) =>
              event.streamId === streamId && event.timestamp > lastEventTimestamp,
          )
          .sort(([_idA, eventA], [_idB, eventB]) => eventA.timestamp - eventB.timestamp);

        logger.info(
          {
            count: eventsToReplay.length,
            streamId,
            replayId,
            lastEventId,
            lastEventTimestamp,
          },
          `Replaying ${eventsToReplay.length} events for stream ${streamId}`,
        );

        // Send all events that came after the last event
        for (const [eventId, event] of eventsToReplay) {
          try {
            // Log within context of this specific event
            await requestContext.run(
              { eventId, sessionId: streamId, replayId } as LoggerContext,
              async () => {
                logger.debug(
                  {
                    messageId:
                      typeof event.message === 'object' &&
                      event.message !== null &&
                      'id' in event.message
                        ? event.message.id
                        : undefined,
                    method:
                      typeof event.message === 'object' &&
                      event.message !== null &&
                      'method' in event.message
                        ? event.message.method
                        : undefined,
                  },
                  `Replaying event ${eventId}`,
                );

                await send(eventId, event.message);
              },
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(
              { eventId, streamId, replayId, error: errorMessage },
              `Error replaying event ${eventId} for stream ${streamId}: ${errorMessage}`,
            );
            // Continue with other events even if one fails
          }
        }

        return streamId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          { streamId, replayId, error: errorMessage },
          `Error during event replay for stream ${streamId}: ${errorMessage}`,
        );
        return streamId; // Still return the stream ID even if replay failed
      }
    });
  }

  /**
   * Remove the oldest events to stay within limits
   * @param count Number of events to remove
   */
  private pruneOldestEvents(count: number): void {
    if (count <= 0 || this.events.size === 0) {
      return;
    }

    // Sort events by timestamp
    const sortedEvents = Array.from(this.events.entries()).sort(
      ([_a, eventA], [_b, eventB]) => eventA.timestamp - eventB.timestamp,
    );

    // Remove the oldest events
    const eventsToRemove = Math.min(count, sortedEvents.length);
    for (let i = 0; i < eventsToRemove; i++) {
      const [eventId] = sortedEvents[i];
      this.events.delete(eventId);
    }

    if (eventsToRemove > 0) {
      logger.info(
        { count: eventsToRemove },
        `Pruned ${eventsToRemove} oldest events to stay within event limit`,
      );
    }
  }

  /**
   * Clean up old events based on maxEventAge
   */
  private cleanupOldEvents(): void {
    const now = Date.now();
    let eventsRemoved = 0;

    // Remove events older than maxEventAge
    for (const [eventId, event] of this.events.entries()) {
      const eventAge = now - event.timestamp;

      if (eventAge > this.maxEventAge) {
        this.events.delete(eventId);
        eventsRemoved++;
      }
    }

    if (eventsRemoved > 0) {
      logger.info({ count: eventsRemoved }, `Cleaned up ${eventsRemoved} expired events`);
    }
  }

  /**
   * Clear all events for a specific stream
   * @param streamId The stream ID to clear events for
   */
  async clearEventsForStream(streamId: StreamId): Promise<void> {
    // Find and remove all events for this stream
    for (const [eventId, event] of this.events.entries()) {
      if (event.streamId === streamId) {
        this.events.delete(eventId);
      }
    }

    // Add an await to satisfy ESLint require-await rule
    await Promise.resolve();
  }

  /**
   * Clear all events from all streams
   */
  async clearAllEvents(): Promise<void> {
    this.events.clear();

    // Add an await to satisfy ESLint require-await rule
    await Promise.resolve();
  }

  /**
   * Extract the stream ID from an event ID
   * Our event IDs are formatted as: streamId-timestamp-random
   */
  private getStreamIdFromEventId(eventId: string): string {
    // Split the event ID by '-' and take the first part (the stream ID)
    const parts = eventId.split('-');
    if (parts.length < 2) {
      return '';
    }
    // The stream ID could contain hyphens, so we need to be careful
    // Our format is streamId-timestamp-random
    // Since timestamp and random are at the end, we can remove those
    // and what's left is the stream ID
    // Assuming timestamp and random are the last 2 elements
    return parts.slice(0, parts.length - 2).join('-');
  }

  /**
   * Get the number of events stored for a stream
   * @param streamId The stream ID to get event count for
   * @returns The number of events stored for the stream
   */
  getEventCountForStream(streamId: StreamId): number {
    let count = 0;
    for (const event of this.events.values()) {
      if (event.streamId === streamId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get the total number of events stored
   * @returns The total number of events stored
   */
  getEventCount(): number {
    return this.events.size;
  }

  /**
   * Dispose of resources used by the event store
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.events.clear();
  }
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
  private eventStore: InMemoryEventStore;

  constructor() {
    // Initialize Express app
    this.app = express();

    // Add request ID and correlation middleware
    this.app.use((req, res, next) => {
      // Generate a request ID if not provided
      const requestId = (req.headers['x-request-id'] as string) || uuidv4();
      const sessionId = req.headers['mcp-session-id'] as string;

      // Set the request ID on the response headers
      res.setHeader('x-request-id', requestId);

      // Store context for logging
      requestContext.run({ requestId, sessionId }, () => {
        next();
      });
    });

    // Add request logging middleware
    const httpLogger = pinoHttp({
      // Use base pino logger instance for HTTP logging to avoid compatibility issues
      logger: baseLogger,
      genReqId: (req) => (req.headers['x-request-id'] as string) || uuidv4(),
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customProps: (req) => {
        return {
          sessionId: req.headers['mcp-session-id'],
        };
      },
    });
    this.app.use(httpLogger);

    this.app.use(express.json());

    // Initialize event store for session resumability
    this.eventStore = new InMemoryEventStore();
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
      logger.warn(
        'WARNING: No API key configured for HTTP transport. This is a security risk in production environments.',
      );
    }

    // Configure event store with custom settings if provided
    if (config.eventStore) {
      // Dispose existing event store
      this.eventStore.dispose();
      // Create new event store with configured values
      this.eventStore = new InMemoryEventStore(
        config.eventStore.maxEvents,
        config.eventStore.maxEventAgeInMinutes,
      );
    }

    // Create HTTP stream transport with session management and event store
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
        logger.info({ sessionId }, `Creating new session with ID: ${sessionId}`);
        return sessionId;
      },

      // Configure session initialization handler
      onsessioninitialized: (sessionId: string) => {
        logger.info({ sessionId }, `Session initialized with ID: ${sessionId}`);
      },

      // Event store for resumable connections
      eventStore: this.eventStore,

      // Enable optional JSON response for non-streaming requests
      enableJsonResponse: true,
    });

    // Set up Express routes for HTTP
    const endpoint = config.path || '/mcp';

    // Handle POST requests
    this.app.post(endpoint, async (req, res) => {
      try {
        await httpTransport.handleRequest(req, res, req.body);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ error: errorMessage }, `Error handling POST request: ${errorMessage}`);

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
        logger.error({ error: errorMessage }, `Error handling GET request: ${errorMessage}`);

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
        logger.error({ error: errorMessage }, `Error handling DELETE request: ${errorMessage}`);

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
      logger.info(
        { port: httpPort, endpoint, provider },
        `MCP Control server running on HTTP at http://localhost:${httpPort}${endpoint} (using ${provider})`,
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

    // Clean up and dispose the event store
    await this.eventStore.clearAllEvents();
    this.eventStore.dispose();

    // Close the HTTP server if it exists
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          logger.info('HTTP server closed and all resources cleaned up');
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
      logger.warn(
        '⚠️  SECURITY WARNING: CORS is configured to allow ALL origins (*). This allows any website to make requests to this API, which is a significant security risk. → Production Recommendation: Specify exact origins using CORS_ORIGINS env variable. → Example: CORS_ORIGINS=https://example.com,https://admin.example.com',
      );
    }

    // Check for overly permissive array of origins
    if (Array.isArray(origin) && origin.includes('*')) {
      logger.warn(
        '⚠️  SECURITY WARNING: CORS includes wildcard (*) in origins list. → Production Recommendation: Remove wildcard and specify exact origins.',
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
        const origins = nonHttpsOrigins.join(', ');
        logger.warn(
          { nonHttpsOrigins },
          `⚠️  SECURITY WARNING: Non-HTTPS origins detected in production environment: ${origins}. → Recommendation: Use HTTPS for all origins in production.`,
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
      logger.error(
        '🛑 CRITICAL SECURITY WARNING: API key is empty or undefined. Authentication is effectively disabled! Anyone can access and control this computer. → Set API_KEY environment variable with a strong secret key.',
      );
      return;
    }

    // Check API key strength
    if (apiKey.length < 16) {
      logger.warn(
        '⚠️  SECURITY WARNING: API key is too short (less than 16 characters). → Recommendation: Use a longer, randomly generated key.',
      );
    }

    // Check if API key is a common test value
    const commonTestKeys = ['test', 'apikey', 'secret', 'key', '1234', 'password'];
    if (commonTestKeys.some((testKey) => apiKey.toLowerCase().includes(testKey))) {
      logger.warn(
        '⚠️  SECURITY WARNING: API key contains common test values. → Recommendation: Use a random, unique key for production. → Example: Run "openssl rand -base64 32" to generate a secure key.',
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
            // Clean up session data
            this.sessions.delete(sessionId);

            // Also clean up any events for this stream (using sessionId as streamId)
            // Use Promise-based approach since we can't use await in a non-async callback
            this.eventStore
              .clearEventsForStream(sessionId)
              .then(() => {
                logger.info({ sessionId }, `Events cleared for expired session ${sessionId}`);
              })
              .catch((error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(
                  { sessionId, error: errorMessage },
                  `Error clearing events for session ${sessionId}: ${errorMessage}`,
                );
              });

            // Get the overall event count, we don't need per-session count now
            try {
              const totalEventCount = this.eventStore.getEventCount();
              logger.info(
                { sessionId, totalEventCount },
                `Session ${sessionId} expired and was removed (${totalEventCount} total events remain)`,
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error({ error: errorMessage }, `Error getting event count: ${errorMessage}`);
              logger.info({ sessionId }, `Session ${sessionId} expired and was removed`);
            }
          }
        }

        // Log some statistics about event store
        try {
          const eventCount = this.eventStore.getEventCount();
          if (eventCount > 0) {
            logger.info({ eventCount }, `Event store stats: ${eventCount} events stored`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error({ error: errorMessage }, `Error getting event store stats: ${errorMessage}`);
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
