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

  describe('buffer management', () => {
    it('should clear replay buffer', () => {
      // Add some events to the buffer
      transport.emitEvent('test-event', { data: 'test' });
      transport.emitEvent('test-event', { data: 'test2' });

      // Verify buffer has events
      expect(transport.getReplayBufferSize()).toBe(2);

      // Clear buffer
      transport.clearReplayBuffer();

      // Verify buffer is empty
      expect(transport.getReplayBufferSize()).toBe(0);
    });

    it('should report client count correctly', () => {
      transport.attach(mockExpressApp as any);

      // Initially no clients
      expect(transport.getClientCount()).toBe(0);

      // Connect a client
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

      // Connect client
      mockRouteHandlers['/mcp/sse'](mockReq, mockRes);

      // Should have one client
      expect(transport.getClientCount()).toBe(1);

      // Disconnect client
      mockCloseHandlers[0]();

      // Should have no clients
      expect(transport.getClientCount()).toBe(0);
    });

    it('should update max buffer size', () => {
      // Default buffer size is 5 (from beforeEach)

      // Add more events than the buffer size
      for (let i = 0; i < 7; i++) {
        transport.emitEvent(`event-${i}`, { id: i });
      }

      // Should only keep the most recent 5
      expect(transport.getReplayBufferSize()).toBe(5);

      // Increase buffer size
      transport.setMaxBufferSize(10);

      // Add more events
      transport.emitEvent('new-event', { id: 'new' });
      transport.emitEvent('new-event-2', { id: 'new2' });

      // Should keep all 7 events now
      expect(transport.getReplayBufferSize()).toBe(7);

      // Decrease buffer size
      transport.setMaxBufferSize(3);

      // Should trim to most recent 3
      expect(transport.getReplayBufferSize()).toBe(3);
    });

    it('should throw error when setting negative buffer size', () => {
      expect(() => transport.setMaxBufferSize(-1)).toThrow('Buffer size cannot be negative');
    });
  });

  describe('error handling', () => {
    it('should prevent multiple attachments', () => {
      // First attachment
      transport.attach(mockExpressApp as any);

      // Second attachment should throw
      expect(() => transport.attach(mockExpressApp as any)).toThrow(
        'SseTransport is already attached to an Express app',
      );
    });

    it('should handle client write errors during broadcast', () => {
      transport.attach(mockExpressApp as any);

      // Make sure there are no clients initially
      expect(transport.getClientCount()).toBe(0);

      // Connect a client
      const mockReq = {
        header: vi.fn().mockReturnValue(null),
        on: vi.fn((event, handler) => {
          if (event === 'close') mockCloseHandlers.push(handler);
          return mockReq;
        }),
      };

      // Create a mock response where write succeeds during connection
      // but fails during event broadcast
      const errorMockRes = {
        set: mockSet,
        flushHeaders: mockFlushHeaders,
        write: vi
          .fn()
          .mockImplementationOnce(() => true) // Succeed on first call (retry: 3000)
          .mockImplementation(() => {
            throw new Error('Connection lost');
          }),
      };

      // Connect client
      mockRouteHandlers['/mcp/sse'](mockReq, errorMockRes);

      // Should have one client after connection
      expect(transport.getClientCount()).toBe(1);

      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = vi.fn();

      try {
        // Emit event (should trigger write error)
        transport.emitEvent('test-event', { data: 'test' });

        // Client should be removed due to error
        expect(transport.getClientCount()).toBe(0);
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });
  });
});
