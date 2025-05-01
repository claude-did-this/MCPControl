import { Response } from 'express';
import { ulid } from 'ulid';
import { Transport } from './baseTransport';

/**
 * Server-Sent Events transport for streaming real-time events
 *
 * This transport maintains an in-memory buffer of recent events
 * and can replay missed events for clients that reconnect
 */
export class SseTransport extends Transport {
  /**
   * Set of connected SSE clients
   */
  private clients = new Set<Response>();

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
   * Creates a new SSE transport
   * @param options Configuration options
   * @param options.maxBufferSize Maximum number of events to keep in replay buffer (default: 100)
   * @param options.heartbeatInterval Interval in ms to send keepalive pings (default: 25000)
   */
  constructor(options: { maxBufferSize?: number; heartbeatInterval?: number } = {}) {
    super();
    this.maxBufferSize = options.maxBufferSize ?? 100;
    this.heartbeatInterval = options.heartbeatInterval ?? 25000;
  }

  /**
   * Attaches this SSE transport to the Express application
   * @param app Express application instance
   * @returns void
   */
  attach(app: import('express').Express): void {
    app.get('/mcp/sse', (req, res) => {
      // Set SSE headers
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders(); // send headers right away

      // Suggest client reconnection time
      res.write('retry: 3000\n\n');

      // Add client to active connections
      this.clients.add(res);

      // Replay missed events if Last-Event-ID is present
      const lastId = req.header('Last-Event-ID');
      if (lastId) {
        const eventsToReplay = this.replayBuffer.filter((e) => e.id > lastId);
        eventsToReplay.forEach((e) => res.write(e.data));
      }

      // Remove client when connection closes
      req.on('close', () => {
        this.clients.delete(res);
      });
    });

    // Start the heartbeat timer if not already running
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => this.broadcast(':\n\n'), this.heartbeatInterval);
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
    for (const res of this.clients) {
      res.write(chunk);
    }
  }

  /**
   * Stops the heartbeat timer
   * @returns void
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
