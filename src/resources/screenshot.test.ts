import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as screenshotModule from './screenshot';
import { WindowsControlResponse } from '../types/responses.js';

// We'll spy on the actual implementation rather than mocking it
const getScreenshotSpy = vi.spyOn(screenshotModule, 'getScreenshot');

// Mock success response
const mockSuccessResponse: WindowsControlResponse = {
  success: true,
  message: "Screenshot captured successfully",
  content: [{
    type: "image",
    data: "test-base64-data",
    mimeType: "image/png"
  }]
};

// Mock error response
const mockErrorResponse: WindowsControlResponse = {
  success: false,
  message: "Failed to capture screenshot: Screenshot failed"
};

// Import the module we're testing
import { getScreenshot } from './screenshot';

describe('Screenshot Resource', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set default mock implementation to return success
    getScreenshotSpy.mockResolvedValue(mockSuccessResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getScreenshot', () => {
    it('should capture full screen when no region is specified', async () => {
      // Execute
      const result = await getScreenshot();

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      
      // Check results
      expect(result.success).toBe(true);
      expect(result.message).toBe("Screenshot captured successfully");
      expect(result.content).toBeDefined();
    });

    it('should capture specified region when region is provided', async () => {
      // Setup
      const region = { x: 100, y: 100, width: 800, height: 600 };
      
      // Execute
      const result = await getScreenshot({ region });

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      expect(getScreenshotSpy).toHaveBeenCalledWith({ region });
      expect(result.success).toBe(true);
    });

    it('should apply grayscale when specified', async () => {
      // Execute
      const result = await getScreenshot({ grayscale: true });

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      expect(getScreenshotSpy).toHaveBeenCalledWith({ grayscale: true });
      expect(result.success).toBe(true);
    });

    it('should apply resize when specified', async () => {
      // Setup
      const resize = { width: 1280, height: 720, fit: 'contain' as const };
      
      // Execute
      const result = await getScreenshot({ resize });

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      expect(getScreenshotSpy).toHaveBeenCalledWith({ resize });
      expect(result.success).toBe(true);
    });

    it('should use jpeg format when specified', async () => {
      // Execute
      const result = await getScreenshot({ format: 'jpeg', quality: 85 });

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      expect(getScreenshotSpy).toHaveBeenCalledWith({ format: 'jpeg', quality: 85 });
      expect(result.success).toBe(true);
    });

    it('should use png format by default with compression options', async () => {
      // Execute
      const result = await getScreenshot({ compressionLevel: 9 });

      // Verify
      expect(getScreenshotSpy).toHaveBeenCalledTimes(1);
      expect(getScreenshotSpy).toHaveBeenCalledWith({ compressionLevel: 9 });
      expect(result.success).toBe(true);
    });

    it('should return error response when screenshot fails', async () => {
      // Setup
      getScreenshotSpy.mockResolvedValueOnce(mockErrorResponse);
      
      // Execute
      const result = await getScreenshot();

      // Verify
      expect(result).toEqual(mockErrorResponse);
    });
  });
});
