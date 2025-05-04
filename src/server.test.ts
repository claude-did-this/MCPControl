import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll define the mocks before importing the module being tested
const mockMcpServer = {
  connect: vi.fn(),
};

const mockApp = {
  get: vi.fn(),
  use: vi.fn(),
  post: vi.fn(),
};

const mockHttpServer = {
  listen: vi.fn((port, host, callback) => {
    if (callback) callback();
    return mockHttpServer;
  }),
  close: vi.fn(),
  on: vi.fn(),
};

const mockSSETransport = {
  sessionId: 'test-session-id',
  onclose: null,
  handlePostMessage: vi.fn(),
};

// Mock the dependencies before importing the module to test
vi.mock('express', () => {
  return {
    default: vi.fn(() => mockApp),
    json: vi.fn(),
  };
});

vi.mock('http', () => {
  return {
    createServer: vi.fn(() => mockHttpServer),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/sse.js', () => {
  return {
    SSEServerTransport: vi.fn(() => mockSSETransport),
  };
});

vi.mock('os', () => {
  return {
    networkInterfaces: vi.fn(() => ({
      eth0: [
        {
          family: 'IPv4',
          internal: false,
          address: '192.168.1.100',
        },
      ],
    })),
  };
});

// Now import the module being tested
import { createHttpServer } from './server.js';

describe('HTTP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAX_SSE_CLIENTS = '100';

    // Mock console.log to prevent test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('should create an HTTP server with SSE transport', () => {
    const result = createHttpServer(mockMcpServer as any);

    // Should have created a server
    expect(mockHttpServer).toBeDefined();
    expect(result.app).toBe(mockApp);
    expect(result.httpServer).toBe(mockHttpServer);
  });

  it('should register client limit middleware', () => {
    createHttpServer(mockMcpServer as any);

    // Should have registered middleware for client limits
    expect(mockApp.use).toHaveBeenCalledWith('/mcp', expect.any(Function));
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
    expect(mockHttpServer.listen).toHaveBeenCalledWith(port, '0.0.0.0', expect.any(Function));
  });
});
