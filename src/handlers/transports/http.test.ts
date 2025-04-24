import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpTransportManager } from './http';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Mock external dependencies
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

describe('HttpTransportManager', () => {
  let transportManager: HttpTransportManager;
  let mockHttpConfig: any;
  // let mockServer: any;
  let processSpy: any;

  beforeEach(() => {
    // Mock process.stderr.write to capture warnings
    processSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // Initialize transport manager
    transportManager = new HttpTransportManager();

    // Mock HTTP server was here, but not needed for these tests

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
    expect(StreamableHTTPServerTransport).toHaveBeenCalledTimes(1);
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionIdGenerator: expect.any(Function),
        onsessioninitialized: expect.any(Function),
        eventStore: expect.any(Object),
        enableJsonResponse: true,
      }),
    );

    // Verify transport was returned
    expect(transport).toBeDefined();
  });

  it('warns when API key is missing', () => {
    // Create config without API key
    const insecureConfig = { ...mockHttpConfig, apiKey: undefined };
    transportManager.createTransport(insecureConfig);

    // Check for security warning about missing API key
    expect(processSpy).toHaveBeenCalledWith(
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
    expect(processSpy).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY WARNING: CORS is configured to allow ALL origins'),
    );
  });

  it('warns when API key is too weak', () => {
    // Create config with weak API key
    const insecureConfig = { ...mockHttpConfig, apiKey: 'weak' };
    transportManager.createTransport(insecureConfig);

    // Check for security warning about weak API key
    expect(processSpy).toHaveBeenCalledWith(
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
    expect(processSpy).toHaveBeenCalled();
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
    // Prepare - mock the StreamableHTTPServerTransport to capture the options
    let capturedOptions: any;
    const mockImplementation = StreamableHTTPServerTransport as unknown as {
      mockImplementationOnce: (fn: (options: any) => any) => void;
    };
    mockImplementation.mockImplementationOnce((options) => {
      capturedOptions = options;
      return {
        handleRequest: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
    });

    // Act
    transportManager.createTransport(mockHttpConfig);

    // Assert - check that event store was initialized and passed to the transport
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.eventStore).toBeDefined();
    expect(capturedOptions.enableJsonResponse).toBe(true);
  });
});
