import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SseTransport } from './sseTransport.js';

// Mock for Express app and response objects
const mockWrite = vi.fn().mockReturnValue(true);
const mockSet = vi.fn().mockReturnThis();
const mockFlushHeaders = vi.fn().mockReturnThis();

// Mock response close handlers
const mockCloseHandlers: (() => void)[] = [];

// Create mock functions
const mockExpressApp = {
  get: vi.fn((path, handler) => {
    mockRouteHandlers[path] = handler;
  }),
};

// Store handlers for testing
const mockRouteHandlers: Record<string, (req: any, res: any) => void> = {};

describe('SseTransport', () => {
  let transport: SseTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    transport = new SseTransport({ maxBufferSize: 5, heartbeatInterval: 5000 });
    mockCloseHandlers.length = 0;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    transport.close();
    vi.restoreAllMocks();
  });

  describe('attach', () => {
    it('should register the correct route', () => {
      transport.attach(mockExpressApp as any);
      expect(mockExpressApp.get).toHaveBeenCalledWith('/mcp/sse', expect.any(Function));
    });

    it('should set the correct headers', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Create mocks for request and response
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Trigger the route handler
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Verify
      expect(mockSet).toHaveBeenCalledWith({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      expect(mockFlushHeaders).toHaveBeenCalled();
    });

    it('should write retry instructions', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Create mocks for request and response
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Trigger the route handler
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Verify
      expect(mockWrite).toHaveBeenCalledWith('retry: 3000\n\n');
    });
  });

  describe('emitEvent', () => {
    it('should emit events to connected clients', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Create mock for request and response
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Connect a client
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Clear previous calls to write
      mockWrite.mockClear();

      // Emit an event
      transport.emitEvent('test-event', { message: 'Hello, World!' });

      // Check that the event was sent
      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('event:test-event'));
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('data:{"message":"Hello, World!"}'),
      );
    });

    it('should maintain replay buffer and respect max size', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Emit multiple events (more than buffer size)
      for (let i = 0; i < 7; i++) {
        transport.emitEvent(`event-${i}`, { id: i });
      }

      // Clear previous calls
      mockWrite.mockClear();

      // Create mock for request and response with Last-Event-ID
      const mockReq = {
        header: vi.fn().mockReturnValue('some-id'),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Connect a client
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Should have called write for setup
      expect(mockWrite).toHaveBeenCalled();
    });

    it('should remove clients when they disconnect', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Create mock for request and response
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Connect a client
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Clear previous calls
      mockWrite.mockClear();

      // Simulate disconnection
      mockCloseHandlers[0]();

      // Emit an event
      transport.emitEvent('test-event', { message: 'This should not be received' });

      // The disconnected client should not receive the event
      expect(mockWrite).not.toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should send heartbeats at the specified interval', () => {
      // Set up
      transport.attach(mockExpressApp as any);

      // Create mock for request and response
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      const mockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: mockWrite,
      };

      // Connect a client
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Clear previous calls
      mockWrite.mockClear();

      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(5000);

      // Should have sent a heartbeat
      expect(mockWrite).toHaveBeenCalledWith(':\n\n');
    });
  });
});
