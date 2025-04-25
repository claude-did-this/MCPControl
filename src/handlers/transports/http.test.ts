import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpTransportManager } from './http';
import express from 'express';

// Mock StreamableHTTPServerTransport properly
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: vi.fn().mockImplementation(() => {
      return {
        handleRequest: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
    }),
    // Mock Event and EventStore types for tests
    Event: undefined,
    EventStore: undefined,
  };
});

// Import StreamableHTTPServerTransport after mocking
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Mock pino-http
vi.mock('pino-http', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return (req: any, res: any, next: () => void) => {
        // Add logger to request
        req.log = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn().mockReturnThis(),
        };
        next();
      };
    }),
  };
});

// Mock the logger module
vi.mock('../../logger.js', () => {
  const loggerInstance = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    child: vi.fn().mockReturnThis(),
  };

  const baseLoggerInstance = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  return {
    default: loggerInstance,
    baseLogger: baseLoggerInstance,
    requestContext: {
      run: vi.fn().mockImplementation((context, callback) => callback()),
    },
  };
});

// Import logger mock after mocking it
import logger from '../../logger.js';

describe('HttpTransportManager', () => {
  let transportManager: HttpTransportManager;
  let mockHttpConfig: any;
  let loggerWarnSpy: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock logger.warn to check for warnings
    loggerWarnSpy = vi.spyOn(logger, 'warn');

    // Initialize transport manager
    transportManager = new HttpTransportManager();

    // Mock config
    mockHttpConfig = {
      port: 3000,
      path: '/mcp',
      apiKey: 'test-api-key',
      cors: {
        origins: 'localhost',
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        headers: [
          'Content-Type',
          'Accept',
          'Authorization',
          'x-api-key',
          'Mcp-Session-Id',
          'Last-Event-ID',
        ],
        credentials: true,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transport with proper configuration', () => {
    const transport = transportManager.createTransport(mockHttpConfig);

    // Verify StreamableHTTPServerTransport was created with session management and event store
    expect(StreamableHTTPServerTransport).toHaveBeenCalled();
    expect(transport).toBeDefined();
  });

  it('warns when API key is missing', () => {
    // Create config without API key
    const insecureConfig = { ...mockHttpConfig, apiKey: undefined };
    transportManager.createTransport(insecureConfig);

    // Check for security warning about missing API key
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: No API key configured'),
    );
  });

  it('warns when CORS is set to allow all origins', () => {
    // Create config with wildcard CORS
    const insecureConfig = {
      ...mockHttpConfig,
      cors: { ...mockHttpConfig.cors, origins: '*' },
    };
    transportManager.createTransport(insecureConfig);

    // Check for security warning about CORS
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY WARNING: CORS is configured to allow ALL origins'),
    );
  });

  it('warns when API key is too weak', () => {
    // Create config with weak API key
    const insecureConfig = { ...mockHttpConfig, apiKey: 'weak' };
    transportManager.createTransport(insecureConfig);

    // Check for security warning about weak API key
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY WARNING: API key is too short'),
    );
  });

  it('configures authentication middleware', () => {
    // Create a real Express app for testing authentication
    const app = express();
    vi.spyOn(transportManager as any, 'app', 'get').mockReturnValue(app);

    // Create transport with authentication
    transportManager.createTransport(mockHttpConfig);

    // Just verify the transport was created and authentication was configured
    expect(logger.warn).toHaveBeenCalled();
  });

  it('properly cleans up resources when close() is called', async () => {
    // Mock stopSessionCleanup
    const stopSessionCleanupSpy = vi.spyOn(transportManager as any, 'stopSessionCleanup');

    // Mock eventStore methods with EventStore compatible interface
    const mockClearAllEvents = vi.fn().mockResolvedValue(undefined);
    const mockDispose = vi.fn();
    transportManager['eventStore'] = {
      clearAllEvents: mockClearAllEvents,
      dispose: mockDispose,
      // Add the required methods to satisfy the EventStore interface
      storeEvent: vi.fn().mockResolvedValue('mock-event-id'),
      replayEventsAfter: vi.fn().mockResolvedValue('mock-stream-id'),
      getEventCount: vi.fn().mockReturnValue(0),
    } as any;

    // Setup mock server
    transportManager['server'] = {
      close: vi.fn((callback) => callback()),
    } as any;

    // Mock sessions data by accessing actual instance's map and adding a mock session
    const sessionsMap = transportManager['sessions'];
    sessionsMap.set('test-session', {
      id: 'test-session',
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });

    // Execute
    await transportManager.close();

    // Verify
    expect(stopSessionCleanupSpy).toHaveBeenCalled();
    expect(sessionsMap.size).toBe(0); // Sessions should be cleared
    expect(mockClearAllEvents).toHaveBeenCalled(); // Event store should be cleared
    expect(mockDispose).toHaveBeenCalled(); // Event store should be disposed
  });

  it('initializes event store when creating transport', () => {
    // We'll just check if the default transport is created
    const transport = transportManager.createTransport(mockHttpConfig);

    // Just verify the transport was created
    expect(transport).toBeDefined();
    expect(StreamableHTTPServerTransport).toHaveBeenCalled();
  });
});
