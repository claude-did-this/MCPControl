import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getScreenDimensions,
  transformToNativeCoordinates,
  transformToScreenshotCoordinates,
  resetScreenDimensionsCache,
} from './coordinate-transformer';

// Mock the provider
vi.mock('../providers/factory', () => ({
  createAutomationProvider: () => ({
    screen: {
      getScreenSize: () => ({
        success: true,
        data: { width: 1920, height: 1080 },
      }),
    },
  }),
}));

describe('Coordinate Transformer', () => {
  beforeEach(() => {
    resetScreenDimensionsCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get screen dimensions', async () => {
    const dimensions = await getScreenDimensions();
    expect(dimensions).toEqual({ width: 1920, height: 1080 });
  });

  it('should cache screen dimensions', async () => {
    const dimensions1 = await getScreenDimensions();
    const dimensions2 = await getScreenDimensions();

    expect(dimensions1).toEqual(dimensions2);
  });

  it('should transform coordinates from screenshot to native', async () => {
    // For a 1920x1080 screen with a 1280x720 screenshot (16:9 aspect ratio)
    const screenshotCoords = { x: 640, y: 360 }; // Center of a 1280x720 screenshot
    const nativeCoords = await transformToNativeCoordinates(screenshotCoords);

    // Expected result: center of a 1920x1080 screen
    expect(nativeCoords).toEqual({ x: 960, y: 540 });
  });

  it('should transform coordinates from native to screenshot', async () => {
    // For a 1920x1080 screen with a 1280x720 screenshot (16:9 aspect ratio)
    const nativeCoords = { x: 960, y: 540 }; // Center of a 1920x1080 screen
    const screenshotCoords = await transformToScreenshotCoordinates(nativeCoords);

    // Expected result: center of a 1280x720 screenshot
    expect(screenshotCoords).toEqual({ x: 640, y: 360 });
  });

  it('should handle non-standard scaling', async () => {
    // Test with a custom screenshot width
    const customWidth = 800;
    const screenshotCoords = { x: 400, y: 225 }; // Center of a 800x450 screenshot
    const nativeCoords = await transformToNativeCoordinates(screenshotCoords, customWidth);

    // Expected result in a 1920x1080 screen
    expect(nativeCoords).toEqual({ x: 960, y: 540 });
  });

  it('should handle extreme coordinates', async () => {
    // Test with coordinates at the edge
    const edgeCoords = { x: 1280, y: 720 }; // Bottom-right of a 1280x720 screenshot
    const nativeCoords = await transformToNativeCoordinates(edgeCoords);

    // Expected result: bottom-right of a 1920x1080 screen
    expect(nativeCoords).toEqual({ x: 1920, y: 1080 });
  });

  it('should handle zero coordinates', async () => {
    // Test with coordinates at origin
    const originCoords = { x: 0, y: 0 }; // Top-left of a screenshot
    const nativeCoords = await transformToNativeCoordinates(originCoords);

    // Expected result: top-left of screen
    expect(nativeCoords).toEqual({ x: 0, y: 0 });
  });

  it('should handle roundtrip conversion without significant drift', async () => {
    // Start with screenshot coordinates
    const startCoords = { x: 640, y: 360 };

    // Convert to native
    const nativeCoords = await transformToNativeCoordinates(startCoords);

    // Convert back to screenshot
    const endCoords = await transformToScreenshotCoordinates(nativeCoords);

    // Should be close to the original (may not be exact due to rounding)
    expect(Math.abs(endCoords.x - startCoords.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(endCoords.y - startCoords.y)).toBeLessThanOrEqual(1);
  });
});
