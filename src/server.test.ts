import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll define the mocks before importing the module being tested
const mockMcpServer = {
  on: vi.fn(),
};

const mockApp = {
  get: vi.fn(),
  use: vi.fn(),
};

const mockHttpServer = {
  listen: vi.fn((port, callback) => {
    if (callback) callback();
    return mockHttpServer;
  }),
  close: vi.fn(),
};

const mockSseTransport = {
  attach: vi.fn(),
  emitEvent: vi.fn(),
  getClientCount: vi.fn().mockReturnValue(0),
};

// Mock the dependencies before importing the module to test
vi.mock('express', () => {
  return {
    default: vi.fn(() => mockApp),
  };
});

vi.mock('http', () => {
  return {
    createServer: vi.fn(() => mockHttpServer),
  };
});

vi.mock('./transports/sseTransport.js', () => {
  return {
    SseTransport: vi.fn(() => mockSseTransport),
  };
});

// Now import the module being tested
import { createHttpServer } from './server.js';

describe('HTTP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAX_SSE_CLIENTS = '100';

    // Mock setInterval
    vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as unknown as NodeJS.Timeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('should create an HTTP server with SSE transport', () => {
    createHttpServer(mockMcpServer as any);

    // Should have created a server
    expect(mockHttpServer).toBeDefined();

    // Should have attached the SSE transport
    expect(mockSseTransport.attach).toHaveBeenCalledWith(mockApp);

    // Should have set up a heartbeat timer
    expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 25000);
  });

  it('should register client limit middleware', () => {
    createHttpServer(mockMcpServer as any);

    // Should have registered middleware for client limits
    expect(mockApp.use).toHaveBeenCalledWith('/mcp/sse', expect.any(Function));
  });

  it('should register metrics endpoint', () => {
    createHttpServer(mockMcpServer as any);

    // Should have registered the metrics endpoint
    expect(mockApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
  });

  it('should start listening on the specified port', () => {
    const port = 5555;
    createHttpServer(mockMcpServer as any, port);

    // Should have started listening on the specified port
    expect(mockHttpServer.listen).toHaveBeenCalledWith(port);
  });
});
