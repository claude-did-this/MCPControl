import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clickAt } from './mouse.js';

// Mock the coordinate transformer to avoid native coordinate transformation in tests
vi.mock('./coordinate-transformer.js', () => ({
  transformToNativeCoordinates: vi.fn().mockImplementation((pos) => Promise.resolve(pos)),
  transformToScreenshotCoordinates: vi.fn().mockImplementation((pos) => Promise.resolve(pos)),
  getScreenDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
}));

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
    it('should click at the specified position', async () => {
      const result = await clickAt(100, 200, 'left', true); // Use native coordinates to bypass transformation

      // Verify success response
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked left button at position (100, 200)');
    });

    it('should support different mouse buttons', async () => {
      const result = await clickAt(100, 200, 'right', true); // Use native coordinates to bypass transformation

      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked right button');
    });

    it('should handle invalid coordinates', async () => {
      const result = await clickAt(NaN, 200, 'left', true); // Use native coordinates to bypass transformation

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid coordinates provided');
    });
  });
});
