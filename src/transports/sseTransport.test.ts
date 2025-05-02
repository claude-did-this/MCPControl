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
    transport = new SseTransport();
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

      // Advance timer to trigger heartbeat (default is 25000ms)
      vi.advanceTimersByTime(25000);

      // Should have sent a heartbeat
      expect(mockWrite).toHaveBeenCalledWith(':\n\n');
    });
  });

  describe('client management', () => {
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
  });

  describe('error handling', () => {
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
