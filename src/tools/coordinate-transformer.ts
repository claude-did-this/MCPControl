import { MousePosition } from '../types/common.js';
import { createAutomationProvider } from '../providers/factory.js';

// Get the automation provider
const provider = createAutomationProvider();

// Default screenshot dimensions
const DEFAULT_SCREENSHOT_WIDTH = 1280;

// Cache for screen dimensions to avoid repeated calls
let cachedScreenDimensions: { width: number; height: number } | null = null;

/**
 * Gets the actual screen dimensions, with caching
 * @returns Screen width and height
 */
export function getScreenDimensions(): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    // Return cached dimensions if available
    if (cachedScreenDimensions) {
      resolve(cachedScreenDimensions);
      return;
    }

    try {
      const response = provider.screen.getScreenSize();
      if (response.success && response.data) {
        cachedScreenDimensions = response.data as { width: number; height: number };
        resolve(cachedScreenDimensions);
        return;
      }

      // Fallback dimensions if unable to get screen size
      console.warn('Unable to get screen size, using fallback dimensions');
      resolve({ width: 1920, height: 1080 });
    } catch (error) {
      console.error('Error getting screen dimensions:', error);
      // Fallback dimensions
      resolve({ width: 1920, height: 1080 });
    }
  });
}

/**
 * Transforms coordinates from screenshot space (e.g., 1280x720) to native screen space
 * @param position Position in screenshot coordinates
 * @param screenshotWidth Width of the screenshot (defaults to 1280)
 * @returns Position in native screen coordinates
 */
export async function transformToNativeCoordinates(
  position: MousePosition,
  screenshotWidth = DEFAULT_SCREENSHOT_WIDTH,
): Promise<MousePosition> {
  const screenSize = await getScreenDimensions();

  // Calculate scaling factors
  const scaleX = screenSize.width / screenshotWidth;

  // Calculate the screenshot height (maintaining aspect ratio)
  const screenshotHeight = Math.round((screenSize.height / screenSize.width) * screenshotWidth);
  const scaleY = screenSize.height / screenshotHeight;

  // Transform coordinates
  return {
    x: Math.round(position.x * scaleX),
    y: Math.round(position.y * scaleY),
  };
}

/**
 * Transforms coordinates from native screen space to screenshot space
 * @param position Position in native screen coordinates
 * @param screenshotWidth Width of the screenshot (defaults to 1280)
 * @returns Position in screenshot coordinates
 */
export async function transformToScreenshotCoordinates(
  position: MousePosition,
  screenshotWidth = DEFAULT_SCREENSHOT_WIDTH,
): Promise<MousePosition> {
  const screenSize = await getScreenDimensions();

  // Calculate scaling factors
  const scaleX = screenshotWidth / screenSize.width;

  // Calculate the screenshot height (maintaining aspect ratio)
  const screenshotHeight = Math.round((screenSize.height / screenSize.width) * screenshotWidth);
  const scaleY = screenshotHeight / screenSize.height;

  // Transform coordinates
  return {
    x: Math.round(position.x * scaleX),
    y: Math.round(position.y * scaleY),
  };
}

/**
 * Resets the cached screen dimensions
 * Useful for testing or when screen resolution changes
 */
export function resetScreenDimensionsCache(): void {
  cachedScreenDimensions = null;
}
