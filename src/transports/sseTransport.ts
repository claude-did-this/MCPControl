import { Response } from 'express';
import { Transport } from './baseTransport.js';

/**
 * Server-Sent Events transport for streaming real-time events
 */
export class SseTransport extends Transport {
  /**
   * Set of connected SSE clients
   */
  private clients = new Set<Response>();

  /**
   * Heartbeat interval in milliseconds
   */
  private heartbeatInterval = 25000;

  /**
   * Heartbeat timer handle
   */
  private heartbeatTimer?: NodeJS.Timeout;

  /**
   * Attaches this SSE transport to the Express application
   * @param app Express application instance
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
   */
  emitEvent(eventName: string, payload: unknown): void {
    const data = (eventName ? `event:${eventName}\n` : '') + `data:${JSON.stringify(payload)}\n\n`;

    // Send to all connected clients
    this.broadcast(data);
  }

  /**
   * Broadcasts a raw chunk of data to all connected clients
   * @param chunk The raw data chunk to send
   */
  private broadcast(chunk: string): void {
    const clientsToRemove: Response[] = [];

    for (const res of this.clients) {
      try {
        res.write(chunk);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // If writing fails, mark this client for removal
        clientsToRemove.push(res);
      }
    }

    // Remove any failed clients
    clientsToRemove.forEach((res) => {
      this.clients.delete(res);
    });
  }

  /**
   * Gets the number of connected clients
   * @returns Number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Stops the heartbeat timer and cleans up resources
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Clear clients
    this.clients.clear();
  }
}
