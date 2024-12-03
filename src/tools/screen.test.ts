import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getScreenSize,
  getScreenshot,
  getActiveWindow,
  listAllWindows,
  focusWindow,
  resizeWindow,
  repositionWindow,
  minimizeWindow,
  restoreWindow
} from './screen.js';
import type { ScreenshotOptions } from '../types/common.js';

// Mock sharp
vi.mock('sharp', () => {
  const mockPipeline = {
    grayscale: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data'))
  };
  return {
    default: vi.fn(() => mockPipeline)
  };
});

// Mock libnut
vi.mock('@nut-tree/libnut', () => ({
  default: {
    screen: {
      capture: vi.fn()
    },
    getActiveWindow: vi.fn(),
    getWindowTitle: vi.fn(),
    getWindowRect: vi.fn(),
    getWindows: vi.fn(),
    focusWindow: vi.fn(),
    resizeWindow: vi.fn(),
    moveWindow: vi.fn()
  }
}));

import libnut from '@nut-tree/libnut';
import sharp from 'sharp';

describe('Screen Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getScreenSize', () => {
    it('should return screen dimensions', async () => {
      vi.mocked(libnut.screen.capture).mockReturnValue({
        width: 1920,
        height: 1080,
        image: Buffer.alloc(0),
        byteWidth: 7680,  // width * 4 (BGRA)
        bitsPerPixel: 32,
        bytesPerPixel: 4
      });

      const result = await getScreenSize();

      expect(result).toEqual({
        success: true,
        message: 'Screen size retrieved successfully',
        data: {
          width: 1920,
          height: 1080
        }
      });
    });

    it('should handle errors', async () => {
      vi.mocked(libnut.screen.capture).mockImplementation(() => {
        throw new Error('Screen capture failed');
      });

      const result = await getScreenSize();

      expect(result).toEqual({
        success: false,
        message: 'Failed to get screen size: Screen capture failed'
      });
    });
  });

  describe('getScreenshot', () => {
    const mockScreenCapture = {
      width: 1920,
      height: 1080,
      image: Buffer.from([
        0, 0, 255, 255,  // BGRA pixel
        0, 255, 0, 255,  // BGRA pixel
        255, 0, 0, 255   // BGRA pixel
      ]),
      byteWidth: 7680,  // width * 4 (BGRA)
      bitsPerPixel: 32,
      bytesPerPixel: 4
    };

    beforeEach(() => {
      vi.mocked(libnut.screen.capture).mockReturnValue(mockScreenCapture);
    });

    it('should capture full screen with default options', async () => {
      const result = await getScreenshot();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Screenshot captured successfully');
      expect(result.content?.[0].type).toBe('image');
      expect(result.content?.[0].mimeType).toBe('image/png');
      expect(libnut.screen.capture).toHaveBeenCalledWith();
    });

    it('should capture specific region when provided', async () => {
      const options: ScreenshotOptions = {
        region: { x: 0, y: 0, width: 800, height: 600 }
      };

      await getScreenshot(options);

      expect(libnut.screen.capture).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should apply grayscale when requested', async () => {
      const options: ScreenshotOptions = { grayscale: true };
      
      await getScreenshot(options);

      expect(vi.mocked(sharp().grayscale)).toHaveBeenCalled();
    });

    it('should handle JPEG format with quality', async () => {
      const options: ScreenshotOptions = {
        format: 'jpeg',
        quality: 90
      };

      const result = await getScreenshot(options);

      expect(vi.mocked(sharp().jpeg)).toHaveBeenCalledWith({
        quality: 90,
        mozjpeg: true
      });
      expect(result.content?.[0].mimeType).toBe('image/jpeg');
    });
  });

  describe('Window Management', () => {
    const mockWindowHandle = 12345;  // Changed to number
    const mockWindowInfo = {
      title: 'Test Window',
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 }
    };

    beforeEach(() => {
      vi.mocked(libnut.getActiveWindow).mockResolvedValue(mockWindowHandle);
      vi.mocked(libnut.getWindowTitle).mockResolvedValue(mockWindowInfo.title);
      vi.mocked(libnut.getWindowRect).mockResolvedValue({
        x: 0,
        y: 0,
        width: 800,
        height: 600
      });
      vi.mocked(libnut.getWindows).mockResolvedValue([mockWindowHandle]);
    });

    describe('getActiveWindow', () => {
      it('should return active window information', async () => {
        const result = await getActiveWindow();

        expect(result).toEqual({
          success: true,
          message: 'Active window information retrieved successfully',
          data: mockWindowInfo
        });
      });

      it('should handle errors', async () => {
        vi.mocked(libnut.getActiveWindow).mockRejectedValue(new Error('Failed to get active window'));

        const result = await getActiveWindow();

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to get active window');
      });
    });

    describe('listAllWindows', () => {
      it('should return list of all windows', async () => {
        const result = await listAllWindows();

        expect(result).toEqual({
          success: true,
          message: 'Window list retrieved successfully',
          data: [mockWindowInfo]
        });
      });

      it('should filter out inaccessible windows', async () => {
        vi.mocked(libnut.getWindows).mockResolvedValue([12345, 67890]);
        vi.mocked(libnut.getWindowTitle)
          .mockResolvedValueOnce('Window 1')
          .mockRejectedValueOnce(new Error('Access denied'));

        const result = await listAllWindows();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });

    describe('focusWindow', () => {
      it('should focus window by title', async () => {
        const result = await focusWindow('Test Window');

        expect(result).toEqual({
          success: true,
          message: 'Successfully focused window: Test Window'
        });
        expect(libnut.focusWindow).toHaveBeenCalledWith(mockWindowHandle);
      });

      it('should handle window not found', async () => {
        vi.mocked(libnut.getWindowTitle).mockResolvedValue('Different Window');

        const result = await focusWindow('Test Window');

        expect(result).toEqual({
          success: false,
          message: 'Could not find window with title: Test Window'
        });
      });
    });

    describe('resizeWindow', () => {
      it('should resize window by title', async () => {
        const result = await resizeWindow('Test Window', 1024, 768);

        expect(result).toEqual({
          success: true,
          message: 'Successfully resized window: Test Window'
        });
        expect(libnut.resizeWindow).toHaveBeenCalledWith(mockWindowHandle, {
          width: 1024,
          height: 768
        });
      });
    });

    describe('repositionWindow', () => {
      it('should reposition window by title', async () => {
        const result = await repositionWindow('Test Window', 100, 100);

        expect(result).toEqual({
          success: true,
          message: 'Successfully repositioned window: Test Window'
        });
        expect(libnut.moveWindow).toHaveBeenCalledWith(mockWindowHandle, {
          x: 100,
          y: 100
        });
      });
    });

    describe('Unsupported Operations', () => {
      it('should return appropriate message for minimize', async () => {
        const result = await minimizeWindow('Test Window');
        expect(result.success).toBe(false);
        expect(result.message).toContain('not currently supported');
      });

      it('should return appropriate message for restore', async () => {
        const result = await restoreWindow('Test Window');
        expect(result.success).toBe(false);
        expect(result.message).toContain('not currently supported');
      });
    });
  });
});
// Test change
