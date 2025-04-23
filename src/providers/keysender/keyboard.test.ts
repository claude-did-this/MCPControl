import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeysenderKeyboardAutomation } from './keyboard.js';
import { MAX_TEXT_LENGTH } from '../../tools/validation.zod.js';

// Mock the keysender library
vi.mock('keysender', () => ({
  default: {
    Hardware: vi.fn().mockImplementation(() => ({
      keyboard: {
        sendKey: vi.fn().mockResolvedValue(undefined),
        printText: vi.fn().mockResolvedValue(undefined),
        toggleKey: vi.fn().mockResolvedValue(undefined),
      },
    })),
  },
}));

describe('KeysenderKeyboardAutomation', () => {
  let keyboard: KeysenderKeyboardAutomation;
  let keyboardMock: { sendKey: any; printText: any; toggleKey: any };

  beforeEach(() => {
    keyboard = new KeysenderKeyboardAutomation();
    // @ts-expect-error - accessing private property for testing
    keyboardMock = keyboard.keyboard;

    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('typeTextStream', () => {
    it('should throw an error if text is empty', async () => {
      const generator = keyboard.typeTextStream({ text: '' });
      const result = await generator.next();

      expect(result.done).toBe(true);
      expect(result.value).toEqual({
        success: false,
        message: 'Failed to type text: Text is required',
        stream: true,
        streamInfo: {
          progress: 0,
          isComplete: true,
        },
      });
    });

    it('should throw an error if text is too long', async () => {
      const longText = 'a'.repeat(MAX_TEXT_LENGTH + 1);
      const generator = keyboard.typeTextStream({ text: longText });
      const result = await generator.next();

      expect(result.done).toBe(true);
      expect(result.value).toEqual({
        success: false,
        message: `Failed to type text: Text too long: ${MAX_TEXT_LENGTH + 1} characters (max ${MAX_TEXT_LENGTH})`,
        stream: true,
        streamInfo: {
          progress: 0,
          isComplete: true,
        },
      });
    });

    it('should yield initial response with correct progress info', async () => {
      const generator = keyboard.typeTextStream({ text: 'Hello' });
      const result = await generator.next();

      expect(result.done).toBe(false);
      expect(result.value).toEqual({
        success: true,
        message: 'Starting human-like typing...',
        stream: true,
        streamInfo: {
          progress: 0,
          isComplete: false,
          currentStep: 0,
          totalSteps: 5,
          currentChunk: undefined,
          totalChunks: undefined,
        },
      });
    });

    it('should properly handle chunking for long text', async () => {
      // Test with a small chunk size
      const text = 'abcdefghijklmnopqrstuvwxyz';
      const generator = keyboard.typeTextStream({
        text,
        chunkSize: 10, // Force chunking every 10 characters
      });

      // Get initial response
      const initial = await generator.next();
      expect(initial.value.message).toContain('chunks');
      expect(initial.value.streamInfo.totalChunks).toBe(3);

      // Skip interim updates
      while (!(await generator.next()).done) {
        // Just iterate through
      }

      // Verify sendKey was called for each character
      expect(keyboardMock.sendKey).toHaveBeenCalledTimes(26);
    });

    it('should handle typing errors gracefully', async () => {
      // Make sendKey fail for specific character
      keyboardMock.sendKey.mockImplementation((char: string) => {
        if (char === 'l') {
          return Promise.reject(new Error('Test error'));
        }
        return Promise.resolve();
      });

      const generator = keyboard.typeTextStream({ text: 'Hello' });

      // Get initial response
      await generator.next();

      // Continue processing
      const responses = [];
      let result;

      do {
        result = await generator.next();
        if (!result.done) {
          responses.push(result.value);
        }
      } while (!result.done);

      // Should continue despite errors
      expect(keyboardMock.sendKey).toHaveBeenCalledTimes(5);

      // Final response should still indicate success
      expect(result.value.success).toBe(true);
    });

    it('should apply different delays for punctuation', async () => {
      // Mock setTimeout to track delays
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = vi.fn().mockImplementation((callback, _delay) => {
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      });
      global.setTimeout = mockSetTimeout as any;

      const generator = keyboard.typeTextStream({
        text: 'Hello, world!',
        delay: 50,
        randomize: false, // Disable randomization for deterministic test
      });

      // Skip through all updates
      while (!(await generator.next()).done) {
        // Just iterate through
      }

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;

      // Check delays - normal for most chars, but longer for punctuation
      const delayCallArgs = mockSetTimeout.mock.calls.map((call) => call[1]);

      // Check for increased delay after comma (should be delay*2 = 100ms)
      const commaIndex = 'Hello,'.length - 1;
      expect(delayCallArgs[commaIndex]).toBe(150); // 50ms * 3 = 150ms for comma (base * 2 + space * 0.5)

      // Check for increased delay after exclamation (last char doesn't get delay)
      // Space after comma should have 1.5x delay
      const spaceIndex = 'Hello, '.length - 1;
      expect(delayCallArgs[spaceIndex]).toBe(75); // 50ms * 1.5 = 75ms for space
    });

    it('should return final response with success status', async () => {
      const generator = keyboard.typeTextStream({ text: 'test' });

      // Collect all results including final
      const results = [];
      let result;
      do {
        result = await generator.next();
        results.push(result);
      } while (!result.done);

      // Get the final result (last item)
      const final = results[results.length - 1];

      // Check if it's the completion result
      expect(final.done).toBe(true);
      expect(final.value).toMatchObject({
        success: true,
        message: 'Text typed successfully with human-like timing',
        data: {
          textLength: 4,
          chunks: 1,
        },
        stream: true,
        streamInfo: {
          progress: 100,
          isComplete: true,
          currentStep: 4,
          totalSteps: 4,
        },
      });
    });
  });

  // You can include other tests for regular typeText, pressKey, etc. here if needed
});
