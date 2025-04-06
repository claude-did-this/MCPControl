import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clickAt } from './mouse.js';

// Mock the provider
vi.mock('../providers/factory.js', () => ({
  createAutomationProvider: () => ({
    mouse: {
      clickAt: vi.fn().mockImplementation((x, y, button) => ({
        success: true,
        message: `Clicked ${button} button at position (${x}, ${y})`,
      })),
      getCursorPosition: vi.fn().mockReturnValue({
        success: true,
        message: 'Current cursor position',
        data: { x: 10, y: 20 },
      }),
    },
  }),
}));

describe('Mouse Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clickAt', () => {
    it('should click at the specified position', () => {
      const result = clickAt(100, 200);

      // Verify success response
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked left button at position (100, 200)');
    });

    it('should support different mouse buttons', () => {
      const result = clickAt(100, 200, 'right');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked right button');
    });

    it('should handle invalid coordinates', () => {
      const result = clickAt(NaN, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid coordinates provided');
    });
  });
});
