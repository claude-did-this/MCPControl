import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Declarations must be at the top level - before imports
vi.mock('@nut-tree/libnut', () => ({
  default: {
    screen: {
      capture: vi.fn()
    }
  }
}));

// Mock the sharp module
vi.mock('sharp', () => ({
  default: vi.fn().mockImplementation(() => ({
    grayscale: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test-image-data'))
  }))
}));

// Import mocked modules after vi.mock declarations
import libnut from '@nut-tree/libnut';
import sharp, { Sharp } from 'sharp';
import { getScreenshot } from './screenshot';

describe('Screenshot Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getScreenshot', () => {
    it('should return screenshot data on success', async () => {
      // Setup
      const mockScreen = { 
        width: 1920, 
        height: 1080, 
        image: Buffer.from('test') 
      };
      (libnut.screen.capture as any).mockReturnValue(mockScreen);
      
      const mockBuffer = Buffer.from('test-image-data');
      
      vi.mocked(sharp).mockImplementation(() => ({
        grayscale: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer)
      }) as unknown as Sharp);

      // Execute
      const result = await getScreenshot();

      // Verify
      expect(libnut.screen.capture).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: "Screenshot captured successfully",
        content: [{
          type: "image",
          data: mockBuffer.toString('base64'),
          mimeType: "image/png"
        }]
      });
    });

    it('should handle screenshot with region option', async () => {
      // Setup
      const mockScreen = { 
        width: 800, 
        height: 600, 
        image: Buffer.from('test') 
      };
      (libnut.screen.capture as any).mockReturnValue(mockScreen);
      
      const mockBuffer = Buffer.from('test-image-data');
      
      vi.mocked(sharp).mockImplementation(() => ({
        grayscale: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer)
      }) as unknown as Sharp);

      // Execute
      const result = await getScreenshot({
        region: { x: 100, y: 100, width: 800, height: 600 }
      });

      // Verify
      expect(libnut.screen.capture).toHaveBeenCalledWith(100, 100, 800, 600);
      expect(result).toEqual({
        success: true,
        message: "Screenshot captured successfully",
        content: [{
          type: "image",
          data: mockBuffer.toString('base64'),
          mimeType: "image/png"
        }]
      });
    });

    it('should return error response when capture fails', async () => {
      // Setup
      (libnut.screen.capture as any).mockImplementation(() => {
        throw new Error('Capture failed');
      });

      // Execute
      const result = await getScreenshot();

      // Verify
      expect(result).toEqual({
        success: false,
        message: "Failed to capture screenshot: Capture failed"
      });
    });
  });
});
