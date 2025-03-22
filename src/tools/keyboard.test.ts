import { describe, it, expect, vi, beforeEach } from 'vitest';
import { typeText, pressKey, pressKeyCombination, holdKey } from './keyboard.js';
import type { KeyboardInput, KeyCombination, KeyHoldOperation } from '../types/common.js';

// Mock the provider
vi.mock('../providers/factory.js', () => ({
  createAutomationProvider: () => ({
    keyboard: {
      typeText: vi.fn().mockImplementation(() => ({
        success: true,
        message: 'Typed text successfully'
      })),
      pressKey: vi.fn().mockImplementation((key) => ({
        success: true,
        message: `Pressed key: ${key}`
      })),
      pressKeyCombination: vi.fn().mockImplementation((combination) => ({
        success: true,
        message: `Pressed key combination: ${combination.keys.join('+')}`
      })),
      holdKey: vi.fn().mockImplementation((operation) => 
        operation.state === 'down'
          ? { success: true, message: `Key ${operation.key} held successfully for ${operation.duration}ms` }
          : { success: true, message: `Key ${operation.key} released successfully` }
      )
    }
  })
}));

describe('Keyboard Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('typeText', () => {
    it('should successfully type text', () => {
      const input: KeyboardInput = { text: 'Hello World' };
      const result = typeText(input);
      
      expect(result).toEqual({
        success: true,
        message: 'Typed text successfully'
      });
    });

    it('should handle errors when text is missing', () => {
      const input: KeyboardInput = { text: '' };
      const result = typeText(input);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Text is required');
    });
    
    it('should handle errors when text is too long', () => {
      // Create a string that's too long
      const longText = 'a'.repeat(1001);
      const input: KeyboardInput = { text: longText };
      const result = typeText(input);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Text too long');
    });
  });

  describe('pressKey', () => {
    it('should successfully press a single key', () => {
      const result = pressKey('a');

      expect(result).toEqual({
        success: true,
        message: 'Pressed key: a'
      });
    });

    it('should handle errors when key is invalid', () => {
      const result = pressKey('invalid_key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid key');
    });
  });

  describe('pressKeyCombination', () => {
    it('should successfully press a key combination', async () => {
      const combination: KeyCombination = { keys: ['control', 'c'] };
      const result = await pressKeyCombination(combination);

      expect(result).toEqual({
        success: true,
        message: 'Pressed key combination: control+c'
      });
    });

    it('should handle errors when combination is invalid', async () => {
      const result = await pressKeyCombination({ keys: [] });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Key combination must contain at least one key');
    });
  });

  describe('holdKey', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should successfully hold and release a key', async () => {
      const operation: KeyHoldOperation = {
        key: 'shift',
        duration: 1000,
        state: 'down'
      };

      const holdPromise = holdKey(operation);
      
      // Fast-forward through the duration
      await vi.runAllTimersAsync();
      const result = await holdPromise;

      expect(result).toEqual({
        success: true,
        message: 'Key shift held successfully for 1000ms'
      });
    });

    it('should handle just releasing a key', async () => {
      const operation: KeyHoldOperation = {
        key: 'shift',
        duration: 0,
        state: 'up'
      };

      const result = await holdKey(operation);

      expect(result).toEqual({
        success: true,
        message: 'Key shift released successfully'
      });
    });

    it('should handle errors when key is invalid', async () => {
      const operation: KeyHoldOperation = {
        // @ts--error - Testing invalid input
        key: 'invalid_key',
        duration: 1000,
        state: 'down'
      };

      const result = await holdKey(operation);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid key');
    });
  });
});
