import { describe, it, expect, vi, beforeEach } from 'vitest';
import libnut from '@nut-tree/libnut';
import { clickAt } from './mouse.js';

// Mock libnut
vi.mock('@nut-tree/libnut', () => ({
  default: {
    moveMouse: vi.fn(),
    mouseClick: vi.fn(),
    getMousePos: vi.fn()
  }
}));

describe('Mouse Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock for getMousePos
    (libnut.getMousePos as any).mockReturnValue({ x: 0, y: 0 });
  });

  describe('clickAt', () => {
    it('should move to position, click, and return to original position', () => {
      // Mock original position
      (libnut.getMousePos as any).mockReturnValue({ x: 10, y: 20 });

      const result = clickAt(100, 200);

      // Verify the sequence of operations
      expect(libnut.getMousePos).toHaveBeenCalledTimes(1);
      expect(libnut.moveMouse).toHaveBeenCalledTimes(2);
      expect(libnut.mouseClick).toHaveBeenCalledTimes(1);

      // Verify the correct coordinates were used
      expect(libnut.moveMouse).toHaveBeenNthCalledWith(1, 100, 200);
      expect(libnut.moveMouse).toHaveBeenNthCalledWith(2, 10, 20);
      expect(libnut.mouseClick).toHaveBeenCalledWith('left');

      // Verify success response
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked left button at position (100, 200)');
    });

    it('should support different mouse buttons', () => {
      const result = clickAt(100, 200, 'right');

      expect(libnut.mouseClick).toHaveBeenCalledWith('right');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked right button');
    });

    it('should handle invalid coordinates', () => {
      const result = clickAt(NaN, 200);

      expect(libnut.moveMouse).not.toHaveBeenCalled();
      expect(libnut.mouseClick).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid coordinates provided');
    });

    it('should handle errors during mouse operations', () => {
      (libnut.moveMouse as any).mockRejectedValue(new Error('Mouse movement failed'));

      const result = clickAt(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to click at position');
    });
  });
});
