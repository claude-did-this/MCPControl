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
  // Mutex for handling concurrent storeEvent operations
  private isStoringEvent = false;

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
    // Wait for any existing operation to complete to prevent race conditions
    while (this.isStoringEvent) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    try {
      this.isStoringEvent = true;

      // Generate a unique event ID that includes the stream ID for easy lookup
      const timestamp = Date.now();
      const eventId = `${streamId}-${timestamp}-${Math.floor(Math.random() * 10000)}`;

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

      return eventId;
    } finally {
      this.isStoringEvent = false;
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
    // If no lastEventId, nothing to replay
    if (!lastEventId) {
      return '';
    }

    // Get the stream ID from the event ID
    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId || !this.events.has(lastEventId)) {
      return '';
    }

    // Get all events for this stream (can be optimized if needed)
    // Sort them by timestamp to maintain chronological order
    const allEvents = Array.from(this.events.entries())
      .filter(([_eventId, event]) => event.streamId === streamId)
      .sort(([_idA, eventA], [_idB, eventB]) => eventA.timestamp - eventB.timestamp);

    // Find the index of the last event
    const lastEventIndex = allEvents.findIndex(([eventId]) => eventId === lastEventId);
    if (lastEventIndex === -1) {
      return '';
    }

    // Send all events that came after the last event
    for (let i = lastEventIndex + 1; i < allEvents.length; i++) {
      const [eventId, event] = allEvents[i];
      try {
        await send(eventId, event.message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `Error replaying event ${eventId} for stream ${streamId}: ${errorMessage}\n`,
        );
        // Continue with other events even if one fails
      }
    }

    return streamId;
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
      process.stderr.write(`Pruned ${eventsToRemove} oldest events to stay within event limit\n`);
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
      process.stderr.write(`Cleaned up ${eventsRemoved} expired events\n`);
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
      process.stderr.write(
        'WARNING: No API key configured for HTTP transport. This is a security risk in production environments.\n',
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
        process.stderr.write(`Creating new session with ID: ${sessionId}\n`);
        return sessionId;
      },

      // Configure session initialization handler
      onsessioninitialized: (sessionId: string) => {
        process.stderr.write(`Session initialized with ID: ${sessionId}\n`);
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

    // Clean up and dispose the event store
    await this.eventStore.clearAllEvents();
    this.eventStore.dispose();

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
            // Clean up session data
            this.sessions.delete(sessionId);

            // Also clean up any events for this stream (using sessionId as streamId)
            // Use proper async error handling
            this.eventStore.clearEventsForStream(sessionId).catch((error) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              process.stderr.write(
                `Error clearing events for session ${sessionId}: ${errorMessage}\n`,
              );
            });

            // Get the overall event count, we don't need per-session count now
            try {
              const totalEventCount = this.eventStore.getEventCount();
              process.stderr.write(
                `Session ${sessionId} expired and was removed (${totalEventCount} total events remain)\n`,
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              process.stderr.write(`Error getting event count: ${errorMessage}\n`);
              process.stderr.write(`Session ${sessionId} expired and was removed\n`);
            }
          }
        }

        // Log some statistics about event store
        try {
          const eventCount = this.eventStore.getEventCount();
          if (eventCount > 0) {
            process.stderr.write(`Event store stats: ${eventCount} events stored\n`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          process.stderr.write(`Error getting event store stats: ${errorMessage}\n`);
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
