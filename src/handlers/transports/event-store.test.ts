import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryEventStore } from './http';
import { type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

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

describe('InMemoryEventStore', () => {
  let eventStore: InMemoryEventStore;
  let clock: ReturnType<typeof vi.useFakeTimers>;
  let loggerErrorSpy: any;

  beforeEach(() => {
    // Use fake timers to control time
    clock = vi.useFakeTimers();
    // Initialize a new event store for each test
    eventStore = new InMemoryEventStore(5, 10); // smaller limits for testing
    // Set up the logger error spy
    loggerErrorSpy = vi.spyOn(logger, 'error');
  });

  afterEach(() => {
    eventStore.dispose();
    clock.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should store and retrieve events', async () => {
    // Store a test event
    const streamId = 'test-stream';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };
    const eventId = await eventStore.storeEvent(streamId, message);

    // Verify event was stored
    expect(eventId).toBeDefined();
    expect(eventId).toContain(streamId);
    expect(eventStore.getEventCount()).toBe(1);
    expect(eventStore.getEventCountForStream(streamId)).toBe(1);
  });

  it('should enforce maximum event limit', async () => {
    // Store more than the maximum number of events
    const streamId = 'test-stream';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };

    // Store 7 events (max is 5)
    for (let i = 0; i < 7; i++) {
      await eventStore.storeEvent(streamId, { ...message, id: i });
    }

    // Verify only 5 events remain
    expect(eventStore.getEventCount()).toBe(5);
  });

  it('should clean up old events', async () => {
    // Store some events
    const streamId = 'test-stream';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };

    await eventStore.storeEvent(streamId, message);

    // Advance time to exceed the max event age
    clock.advanceTimersByTime(11 * 60 * 1000); // 11 minutes (max is 10)

    // Trigger cleanup
    eventStore['cleanupOldEvents']();

    // Verify events were cleaned up
    expect(eventStore.getEventCount()).toBe(0);
  });

  it('should clear events for a specific stream', async () => {
    // Store events for different streams
    const streamId1 = 'stream-1';
    const streamId2 = 'stream-2';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };

    await eventStore.storeEvent(streamId1, message);
    await eventStore.storeEvent(streamId2, message);

    // Verify initial counts
    expect(eventStore.getEventCount()).toBe(2);
    expect(eventStore.getEventCountForStream(streamId1)).toBe(1);
    expect(eventStore.getEventCountForStream(streamId2)).toBe(1);

    // Clear events for stream1
    await eventStore.clearEventsForStream(streamId1);

    // Verify stream1 events were cleared but stream2 remains
    expect(eventStore.getEventCount()).toBe(1);
    expect(eventStore.getEventCountForStream(streamId1)).toBe(0);
    expect(eventStore.getEventCountForStream(streamId2)).toBe(1);
  });

  it('should replay events after a specific event ID', async () => {
    // Store several events in chronological order
    const streamId = 'test-stream';
    const message1: JSONRPCMessage = { jsonrpc: '2.0', method: 'test1', id: 1 };
    const message2: JSONRPCMessage = { jsonrpc: '2.0', method: 'test2', id: 2 };
    const message3: JSONRPCMessage = { jsonrpc: '2.0', method: 'test3', id: 3 };

    const eventId1 = await eventStore.storeEvent(streamId, message1);
    clock.advanceTimersByTime(1000); // advance 1 second
    const eventId2 = await eventStore.storeEvent(streamId, message2);
    clock.advanceTimersByTime(1000); // advance 1 second
    const eventId3 = await eventStore.storeEvent(streamId, message3);

    // Mock send function
    const send = vi.fn().mockResolvedValue(undefined);

    // Replay events after eventId1
    const resultStreamId = await eventStore.replayEventsAfter(eventId1, { send });

    // Verify correct events were sent
    expect(resultStreamId).toBe(streamId);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(eventId2, message2);
    expect(send).toHaveBeenCalledWith(eventId3, message3);
  });

  it('should handle errors during event replay', async () => {
    // Store a test event
    const streamId = 'test-stream';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };
    const eventId1 = await eventStore.storeEvent(streamId, message);
    clock.advanceTimersByTime(1000); // advance 1 second
    await eventStore.storeEvent(streamId, message);

    // Mock send function that throws an error
    const send = vi.fn().mockRejectedValue(new Error('Send failed'));

    // Replay events
    const resultStreamId = await eventStore.replayEventsAfter(eventId1, { send });

    // Verify error was logged but operation continued
    expect(resultStreamId).toBe(streamId);
    expect(send).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.any(String),
        streamId,
        replayId: expect.any(String),
        error: expect.any(String),
      }),
      expect.stringContaining('Error replaying event'),
    );
  });

  it('should handle concurrent event storage properly', async () => {
    // Store events concurrently (race condition test)
    const streamId = 'test-stream';
    const message: JSONRPCMessage = { jsonrpc: '2.0', method: 'test', id: 1 };

    // Create many concurrent store operations
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(eventStore.storeEvent(streamId, { ...message, id: i }));
    }

    // Wait for all to complete
    await Promise.all(promises);

    // Verify we have exactly 5 events (our max)
    expect(eventStore.getEventCount()).toBe(5);
  });
});
