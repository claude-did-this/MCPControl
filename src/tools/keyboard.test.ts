import { describe, it, expect, vi, beforeEach } from 'vitest';
import { typeText, pressKey, pressKeyCombination, holdKey } from './keyboard.js';
import type { KeyboardInput, KeyCombination, KeyHoldOperation } from '../types/common.js';

// Mock libnut module
vi.mock('@nut-tree/libnut', () => ({
  default: {
    typeString: vi.fn(),
    keyTap: vi.fn(),
    keyToggle: vi.fn()
  }
}));

// Import the mocked module
import libnut from '@nut-tree/libnut';

describe('Keyboard Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('typeText', () => {
    it('should successfully type text', () => {
      const input: KeyboardInput = { text: 'Hello World' };
      const result = typeText(input);
      
      expect(libnut.typeString).toHaveBeenCalledWith('Hello World');
      expect(result).toEqual({
        success: true,
        message: 'Typed text successfully'
      });
    });

    it('should handle errors when typing text fails', () => {
      const error = new Error('Typing failed');
      vi.mocked(libnut.typeString).mockImplementationOnce(() => { throw error; });

      const input: KeyboardInput = { text: 'Hello World' };
      const result = typeText(input);

      expect(result).toEqual({
        success: false,
        message: 'Failed to type text: Typing failed'
      });
    });
  });

  describe('pressKey', () => {
    it('should successfully press a single key', () => {
      const result = pressKey('a');

      expect(libnut.keyTap).toHaveBeenCalledWith('a');
      expect(result).toEqual({
        success: true,
        message: 'Pressed key: a'
      });
    });

    it('should handle errors when pressing key fails', () => {
      const error = new Error('Key press failed');
      vi.mocked(libnut.keyTap).mockImplementationOnce(() => { throw error; });

      const result = pressKey('a');

      expect(result).toEqual({
        success: false,
        message: 'Failed to press key: Key press failed'
      });
    });
  });

  describe('pressKeyCombination', () => {
    it('should successfully press a key combination', async () => {
      const combination: KeyCombination = { keys: ['control', 'c'] };
      const result = await pressKeyCombination(combination);

      expect(libnut.keyToggle).toHaveBeenCalledTimes(4); // 2 downs + 2 ups
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(1, 'control', 'down');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(2, 'c', 'down');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(3, 'c', 'up');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(4, 'control', 'up');
      expect(result).toEqual({
        success: true,
        message: 'Pressed key combination: control+c'
      });
    });

    it('should attempt cleanup when key combination fails', async () => {
      const error = new Error('Key combination failed');
      vi.mocked(libnut.keyToggle).mockImplementationOnce(() => { throw error; });

      const combination: KeyCombination = { keys: ['control', 'c'] };
      const result = await pressKeyCombination(combination);

      expect(result).toEqual({
        success: false,
        message: 'Failed to press key combination: Key combination failed'
      });
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

      expect(libnut.keyToggle).toHaveBeenCalledTimes(2);
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(1, 'shift', 'down');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(2, 'shift', 'up');
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

      expect(libnut.keyToggle).toHaveBeenCalledTimes(1);
      expect(libnut.keyToggle).toHaveBeenCalledWith('shift', 'up');
      expect(result).toEqual({
        success: true,
        message: 'Key shift released successfully'
      });
    });

    it('should attempt cleanup when hold operation fails', async () => {
      const error = new Error('Hold operation failed');
      vi.mocked(libnut.keyToggle).mockImplementationOnce(() => { throw error; });

      const operation: KeyHoldOperation = {
        key: 'shift',
        duration: 1000,
        state: 'down'
      };

      const result = await holdKey(operation);

      expect(result).toEqual({
        success: false,
        message: 'Failed to down key shift: Hold operation failed'
      });
    });
  });
});
