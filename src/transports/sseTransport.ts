import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { Transport } from './baseTransport.js';

/**
 * Simple metrics to track SSE-related operations
 */
export interface SseMetrics {
  /**
   * Total number of SSE connections since server start
   */
  connectionsTotal: number;

  /**
   * Total number of event replays performed
   */
  replaysTotal: number;

  /**
   * Current number of active SSE connections
   */
  connectionsActive: number;
}

/**
 * Server-Sent Events transport for streaming real-time events
 *
 * This transport maintains an in-memory buffer of recent events
 * and can replay missed events for clients that reconnect.
 *
 * It also implements bidirectional communication with clients through
 * SSE for server-to-client and HTTP POST for client-to-server.
 */
export class SseTransport extends Transport {
  /**
   * Set of connected SSE clients
   */
  private clients = new Set<Response>();

  /**
   * Session ID for this transport
   */
  public readonly sessionId: string;

  /**
   * Message callback provided by MCP server
   */
  private messageCallback?: (message: string) => void;

  /**
   * Close callback that can be set by consumers
   */
  public onclose?: () => void;

  /**
   * In-memory buffer for event replay
   * Stores recent events for reconnection support with Last-Event-ID
   */
  private replayBuffer: { id: string; data: string }[] = [];

  /**
   * Maximum size of the replay buffer (number of events to keep)
   */
  private maxBufferSize: number;

  /**
   * Heartbeat interval in milliseconds
   */
  private heartbeatInterval: number;

  /**
   * Heartbeat timer handle
   */
  private heartbeatTimer?: NodeJS.Timeout;

  /**
   * Flag to track if this transport has been attached to an Express app
   */
  private isAttached = false;

  /**
   * Metrics for Prometheus monitoring
   */
  private metrics: SseMetrics = {
    connectionsTotal: 0,
    replaysTotal: 0,
    connectionsActive: 0,
  };

  /**
   * Creates a new SSE transport
   * @param options Configuration options
   * @param options.maxBufferSize Maximum number of events to keep in replay buffer (default: 100)
   * @param options.heartbeatInterval Interval in ms to send keepalive pings (default: 25000)
   */
  constructor(options: { maxBufferSize?: number; heartbeatInterval?: number } = {}) {
    super();
    this.maxBufferSize = options.maxBufferSize ?? 100;
    this.heartbeatInterval = options.heartbeatInterval ?? 25000;
    this.sessionId = ulid();
  }

  /**
   * Attaches this SSE transport to the Express application
   * @param app Express application instance
   * @returns void
   * @throws Error if the transport has already been attached
   */
  attach(app: import('express').Express): void {
    // Prevent multiple attachments
    if (this.isAttached) {
      throw new Error('SseTransport is already attached to an Express app');
    }

    // Set up the SSE endpoint
    app.get('/mcp/sse', (req, res) => {
      // Set SSE headers
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders(); // send headers right away

      try {
        // Suggest client reconnection time
        res.write('retry: 3000\n\n');

        // Send the session ID to the client so they can include it in POST requests
        res.write(`event:mcp.session\ndata:${JSON.stringify({ sessionId: this.sessionId })}\n\n`);

        // Add client to active connections
        this.clients.add(res);

        // Update metrics for new connection
        this.metrics.connectionsTotal++;
        this.metrics.connectionsActive = this.clients.size;

        // Replay missed events if Last-Event-ID is present
        const lastId = req.header('Last-Event-ID');
        if (lastId) {
          const eventsToReplay = this.replayBuffer.filter((e) => e.id > lastId);

          // Only count as a replay if there are actually events to replay
          if (eventsToReplay.length > 0) {
            this.metrics.replaysTotal++;
          }

          eventsToReplay.forEach((e) => {
            try {
              res.write(e.data);
            } catch (err) {
              // If writing fails, remove the client
              this.clients.delete(res);
              this.metrics.connectionsActive = this.clients.size;
              console.error('Error writing to SSE client:', err);
            }
          });
        }
      } catch (err) {
        // Handle any unexpected errors during setup
        console.error('Error setting up SSE connection:', err);
        this.clients.delete(res);
        try {
          // Attempt to close the response
          res.end();
        } catch {
          // Ignore errors on end
        }
        return;
      }

      // Remove client when connection closes
      req.on('close', () => {
        this.clients.delete(res);
        // Update active connections metric
        this.metrics.connectionsActive = this.clients.size;

        // If we have no more clients, call the onclose callback
        if (this.clients.size === 0 && this.onclose) {
          void this.onclose();
        }
      });
    });

    // Set up the message endpoint for client-to-server communication
    app.post('/mcp/messages', (req: Request, res: Response) => {
      // Verify the session ID
      const sessionId = req.query.sessionId as string;
      if (!sessionId || sessionId !== this.sessionId) {
        res.status(403).json({
          success: false,
          message: 'Invalid or missing session ID',
        });
        return;
      }

      // Handle the message
      this.handlePostMessage(req, res);
    });

    // Start the heartbeat timer if not already running
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => this.broadcast(':\n\n'), this.heartbeatInterval);
    }

    // Mark as attached
    this.isAttached = true;
  }

  /**
   * Handles a POST message from a client
   * This is called by the message endpoint
   */
  handlePostMessage(req: Request, res: Response): void {
    try {
      const body = req.body as Record<string, unknown>;

      // If we have a message callback, forward the message
      if (this.messageCallback) {
        this.messageCallback(JSON.stringify(body));
      }

      // Send a generic success response
      // The actual response will be sent via the SSE channel
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error handling client message:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Broadcasts a JSON payload under the given event name to all connected clients
   * @param eventName Optional event name (defaults to "message")
   * @param payload The data to send (will be JSON stringified)
   * @returns void
   */
  emitEvent(eventName: string, payload: unknown): void {
    const id = ulid();
    const data =
      `id:${id}\n` +
      (eventName ? `event:${eventName}\n` : '') +
      `data:${JSON.stringify(payload)}\n\n`;

    // Store in replay buffer
    this.replayBuffer.push({ id, data });

    // Trim buffer if it exceeds max size
    if (this.replayBuffer.length > this.maxBufferSize) {
      this.replayBuffer.shift();
    }

    // Send to all connected clients
    this.broadcast(data);
  }

  /**
   * Broadcasts a raw chunk of data to all connected clients
   * @param chunk The raw data chunk to send
   * @returns void
   */
  private broadcast(chunk: string): void {
    const clientsToRemove: Response[] = [];

    for (const res of this.clients) {
      try {
        res.write(chunk);
      } catch (err) {
        // If writing fails, mark this client for removal
        clientsToRemove.push(res);
        console.error('Error broadcasting to SSE client:', err);
      }
    }

    // Remove any failed clients
    clientsToRemove.forEach((res) => {
      this.clients.delete(res);
    });

    // Update active connections metric if we removed any clients
    if (clientsToRemove.length > 0) {
      this.metrics.connectionsActive = this.clients.size;
    }
  }

  /**
   * Clears the replay buffer
   * @returns void
   */
  clearReplayBuffer(): void {
    this.replayBuffer = [];
  }

  /**
   * Gets the current size of the replay buffer
   * @returns Number of events in the buffer
   */
  getReplayBufferSize(): number {
    return this.replayBuffer.length;
  }

  /**
   * Gets the number of connected clients
   * @returns Number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Updates the maximum buffer size
   * @param maxSize New maximum buffer size
   * @returns void
   */
  setMaxBufferSize(maxSize: number): void {
    if (maxSize < 0) {
      throw new Error('Buffer size cannot be negative');
    }
    this.maxBufferSize = maxSize;

    // Trim buffer if needed
    while (this.replayBuffer.length > this.maxBufferSize) {
      this.replayBuffer.shift();
    }
  }

  /**
   * Stops the heartbeat timer and cleans up resources
   * @returns Promise that resolves when closed
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Clear clients and buffer
    this.clients.forEach((res) => {
      try {
        res.end();
      } catch {
        // Ignore errors when closing
      }
    });
    this.clients.clear();
    this.isAttached = false;

    // Update active connections metric
    this.metrics.connectionsActive = 0;

    // Call onclose if set
    if (this.onclose) {
      void this.onclose();
    }
  }

  /**
   * Handle an MCP message and route it to appropriate clients
   * @param message MCP JSON-RPC message to distribute
   */
  handleMcpMessage(message: string): void {
    try {
      // Parse the message to determine the appropriate event type
      const parsedMessage = JSON.parse(message) as Record<string, unknown>;

      // Determine the event type based on the message content
      let eventType = 'mcp.message';

      // Use optional chaining and type guard to check method property
      const method = parsedMessage.method;
      if (typeof method === 'string') {
        if (method.startsWith('tool/')) {
          eventType = 'mcp.tool.response';
        } else if (method.startsWith('notification/')) {
          eventType = 'mcp.notification';
        }
      }

      // Emit the event to all clients
      this.emitEvent(eventType, parsedMessage);
    } catch (err) {
      console.error('Error processing MCP message:', err);
      // If we couldn't parse the message, send it as a raw message
      this.emitEvent('mcp.message', { raw: message });
    }
  }

  /**
   * Gets the current metrics for monitoring
   * @returns Current SSE metrics
   */
  getMetrics(): SseMetrics {
    return { ...this.metrics };
  }

  /**
   * Formats metrics for Prometheus scraping
   * @returns Prometheus-formatted metrics string
   */
  getPrometheusMetrics(): string {
    // Ensure metrics values are always numeric with defensive checks
    const connectionsTotal = Number.isFinite(this.metrics.connectionsTotal)
      ? this.metrics.connectionsTotal
      : 0;

    const connectionsActive = Number.isFinite(this.metrics.connectionsActive)
      ? this.metrics.connectionsActive
      : 0;

    const replaysTotal = Number.isFinite(this.metrics.replaysTotal) ? this.metrics.replaysTotal : 0;

    return [
      '# HELP mcp_sse_connections_total Total number of SSE connections established',
      '# TYPE mcp_sse_connections_total counter',
      `mcp_sse_connections_total ${connectionsTotal}`,
      '# HELP mcp_sse_connections_active Current number of active SSE connections',
      '# TYPE mcp_sse_connections_active gauge',
      `mcp_sse_connections_active ${connectionsActive}`,
      '# HELP mcp_sse_replays_total Total number of event replay operations',
      '# TYPE mcp_sse_replays_total counter',
      `mcp_sse_replays_total ${replaysTotal}`,
    ].join('\n');
  }
}
