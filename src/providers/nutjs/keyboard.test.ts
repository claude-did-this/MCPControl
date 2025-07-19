import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NutJSKeyboardAutomation } from './keyboard.js';
import libnut from '@nut-tree-fork/libnut';

// Mock libnut
vi.mock('@nut-tree-fork/libnut', () => {
  return {
    default: {
      typeString: vi.fn(),
      keyTap: vi.fn(),
      keyToggle: vi.fn(),
    },
  };
});

describe('NutJSKeyboardAutomation', () => {
  let keyboard: NutJSKeyboardAutomation;

  beforeEach(() => {
    keyboard = new NutJSKeyboardAutomation();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('typeText', () => {
    it('should type text successfully', () => {
      const text = 'Hello, world!';
      const result = keyboard.typeText({ text });

      expect(libnut.typeString).toHaveBeenCalledWith(text);
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle errors when typing text', () => {
      const error = new Error('Test error');
      vi.mocked(libnut.typeString).mockImplementationOnce(() => {
        throw error;
      });

      const result = keyboard.typeText({ text: 'Hello' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to type text');
      expect(result.message).toContain(error.message);
    });
  });

  describe('pressKey', () => {
    it('should press a key successfully', () => {
      const key = 'enter';
      const result = keyboard.pressKey(key);

      expect(libnut.keyTap).toHaveBeenCalledWith(key);
      expect(result.success).toBe(true);
      expect(result.message).toBe(`Pressed key: ${key}`);
    });

    it('should handle errors when pressing a key', () => {
      const error = new Error('Test error');
      vi.mocked(libnut.keyTap).mockImplementationOnce(() => {
        throw error;
      });

      const result = keyboard.pressKey('enter');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to press key');
      expect(result.message).toContain(error.message);
    });
  });

  describe('pressKeyCombination', () => {
    it('should press key combinations successfully', async () => {
      const keys = ['control', 'c'];
      const result = await keyboard.pressKeyCombination({ keys });

      expect(libnut.keyToggle).toHaveBeenCalledTimes(4); // 2 downs + 2 ups
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(1, 'control', 'down');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(2, 'c', 'down');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(3, 'c', 'up');
      expect(libnut.keyToggle).toHaveBeenNthCalledWith(4, 'control', 'up');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Pressed key combination: control+c');
    });

    it('should handle errors when pressing key combinations', async () => {
      const error = new Error('Test error');
      vi.mocked(libnut.keyToggle).mockImplementationOnce(() => {
        throw error;
      });

      const result = await keyboard.pressKeyCombination({ keys: ['control', 'c'] });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to press key combination');
      expect(result.message).toContain(error.message);
    });
  });

  describe('holdKey', () => {
    it('should hold key successfully', async () => {
      vi.useFakeTimers();
      const holdPromise = keyboard.holdKey({ key: 'shift', state: 'down', duration: 100 });

      expect(libnut.keyToggle).toHaveBeenCalledWith('shift', 'down');

      await vi.advanceTimersByTimeAsync(100);
      const result = await holdPromise;

      expect(libnut.keyToggle).toHaveBeenCalledWith('shift', 'up');
      expect(result.success).toBe(true);
      expect(result.message).toContain('held successfully for 100ms');

      vi.useRealTimers();
    });

    it('should release key successfully', async () => {
      const result = await keyboard.holdKey({ key: 'shift', state: 'up' });

      expect(libnut.keyToggle).toHaveBeenCalledWith('shift', 'up');
      expect(result.success).toBe(true);
      expect(result.message).toContain('released successfully');
    });

    it('should handle errors when holding a key', async () => {
      const error = new Error('Test error');
      vi.mocked(libnut.keyToggle).mockImplementationOnce(() => {
        throw error;
      });

      const result = await keyboard.holdKey({ key: 'shift', state: 'down' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to down key shift');
      expect(result.message).toContain(error.message);
    });
  });
});
