import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock robotjs
vi.mock('@jitsi/robotjs', () => ({
  default: {
    screen: {
      capture: vi.fn(),
    },
    getScreenSize: vi.fn(),
  },
}));

// Create a chainable mock pipeline
const mockPipeline: Record<string, any> = {};
mockPipeline.grayscale = vi.fn(() => mockPipeline);
mockPipeline.resize = vi.fn(() => mockPipeline);
mockPipeline.jpeg = vi.fn(() => mockPipeline);
mockPipeline.png = vi.fn(() => mockPipeline);
mockPipeline.removeAlpha = vi.fn(() => mockPipeline);
mockPipeline.toColorspace = vi.fn(() => mockPipeline);
mockPipeline.toBuffer = vi.fn().mockResolvedValue(Buffer.from('test-image-data'));

vi.mock('sharp', () => ({
  default: vi.fn(() => mockPipeline),
}));

// Import mocked modules after vi.mock declarations
import robot from '@jitsi/robotjs';
import { RobotJSScreenAutomation } from './screen';

describe('RobotJSScreenAutomation', () => {
  let screen: RobotJSScreenAutomation;

  beforeEach(() => {
    vi.resetAllMocks();
    screen = new RobotJSScreenAutomation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getScreenSize', () => {
    it('should return screen dimensions on success', () => {
      // Setup
      (robot.getScreenSize as any).mockReturnValue({ width: 1920, height: 1080 });

      // Execute
      const result = screen.getScreenSize();

      // Verify
      expect(robot.getScreenSize).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Screen size retrieved successfully',
        data: {
          width: 1920,
          height: 1080,
        },
      });
    });

    it('should return error response when getScreenSize fails', () => {
      // Setup
      (robot.getScreenSize as any).mockImplementation(() => {
        throw new Error('Failed to get screen size');
      });

      // Execute
      const result = screen.getScreenSize();

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to get screen size');
    });
  });

  describe('getActiveWindow', () => {
    it('should return error since robotjs does not support window management', () => {
      const result = screen.getActiveWindow();

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not support window management');
    });
  });

  describe('focusWindow', () => {
    it('should return error since robotjs does not support window management', () => {
      const result = screen.focusWindow('Test Window');

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not support window management');
    });
  });

  describe('resizeWindow', () => {
    it('should return error since robotjs does not support window management', async () => {
      const result = await screen.resizeWindow('Test Window', 800, 600);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not support window management');
    });
  });

  describe('repositionWindow', () => {
    it('should return error since robotjs does not support window management', async () => {
      const result = await screen.repositionWindow('Test Window', 100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not support window management');
    });
  });

  describe('getScreenshot', () => {
    it('should call robot.screen.capture for full screen', async () => {
      const mockBitmap = {
        width: 1920,
        height: 1080,
        image: Buffer.alloc(1920 * 1080 * 4),
      };
      (robot.screen.capture as any).mockReturnValue(mockBitmap);

      await screen.getScreenshot();

      // Verify capture was called (full screen = no args)
      expect(robot.screen.capture).toHaveBeenCalled();
    });

    it('should call robot.screen.capture with region coordinates', async () => {
      const mockBitmap = {
        width: 800,
        height: 600,
        image: Buffer.alloc(800 * 600 * 4),
      };
      (robot.screen.capture as any).mockReturnValue(mockBitmap);

      await screen.getScreenshot({
        region: { x: 100, y: 100, width: 800, height: 600 },
      });

      expect(robot.screen.capture).toHaveBeenCalledWith(100, 100, 800, 600);
    });

    it('should handle screenshot capture error gracefully', async () => {
      (robot.screen.capture as any).mockImplementation(() => {
        throw new Error('Screenshot capture failed');
      });

      const result = await screen.getScreenshot();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });
  });
});
