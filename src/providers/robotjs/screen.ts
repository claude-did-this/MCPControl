import robot from '@jitsi/robotjs';
import sharp from 'sharp';
import { ScreenshotOptions } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { ScreenAutomation } from '../../interfaces/automation.js';

/**
 * RobotJS implementation of the ScreenAutomation interface
 */
export class RobotJSScreenAutomation implements ScreenAutomation {
  /**
   * Gets the current screen dimensions
   * @returns WindowsControlResponse with width and height of the screen
   */
  getScreenSize(): WindowsControlResponse {
    try {
      const screenSize = robot.getScreenSize();

      return {
        success: true,
        message: 'Screen size retrieved successfully',
        data: {
          width: screenSize.width,
          height: screenSize.height,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get screen size: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Gets information about the currently active window
   * @returns WindowsControlResponse with title, position, and size of the active window
   * @note RobotJS does not support window management - this returns an error
   */
  getActiveWindow(): WindowsControlResponse {
    // RobotJS does not have window management capabilities
    return {
      success: false,
      message:
        'RobotJS does not support window management. Use a different automation provider for window operations.',
    };
  }

  /**
   * Brings a window to the foreground by searching for a window with the given title
   * @param title - The title or partial title of the window to focus
   * @returns WindowsControlResponse indicating success or failure
   * @note RobotJS does not support window management - this returns an error
   */
  focusWindow(title: string): WindowsControlResponse {
    // RobotJS does not have window management capabilities
    return {
      success: false,
      message: `RobotJS does not support window management. Cannot focus window: ${title}. Use a different automation provider for window operations.`,
    };
  }

  /**
   * Resizes a window to the specified dimensions
   * @param title - The title or partial title of the window to resize
   * @param width - The new width of the window in pixels
   * @param height - The new height of the window in pixels
   * @returns WindowsControlResponse indicating success or failure
   * @note RobotJS does not support window management - this returns an error
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async resizeWindow(
    title: string,
    width: number,
    height: number,
  ): Promise<WindowsControlResponse> {
    // RobotJS does not have window management capabilities
    return {
      success: false,
      message: `RobotJS does not support window management. Cannot resize window: ${title} to ${width}x${height}. Use a different automation provider for window operations.`,
    };
  }

  /**
   * Moves a window to the specified screen coordinates
   * @param title - The title or partial title of the window to reposition
   * @param x - The new x-coordinate of the window in pixels
   * @param y - The new y-coordinate of the window in pixels
   * @returns WindowsControlResponse indicating success or failure
   * @note RobotJS does not support window management - this returns an error
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse> {
    // RobotJS does not have window management capabilities
    return {
      success: false,
      message: `RobotJS does not support window management. Cannot reposition window: ${title} to (${x},${y}). Use a different automation provider for window operations.`,
    };
  }

  /**
   * Captures a screenshot of the entire screen or a specific region with optimized memory usage
   * @param options - Optional configuration for the screenshot:
   *                  - region: Area to capture (x, y, width, height)
   *                  - format: Output format ('png' or 'jpeg')
   *                  - quality: JPEG quality (1-100)
   *                  - compressionLevel: PNG compression level (0-9)
   *                  - grayscale: Convert to grayscale
   *                  - resize: Resize options (width, height, fit)
   * @returns Promise<WindowsControlResponse> with base64-encoded image data
   */
  async getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse> {
    try {
      // Set default options - always use modest sizes and higher compression
      const mergedOptions: ScreenshotOptions = {
        format: 'jpeg',
        quality: 70, // Lower quality for better compression
        resize: {
          width: 1280,
          fit: 'inside',
        },
        ...options,
      };

      // Capture screen or region
      // RobotJS screen.capture() returns a Bitmap object with: width, height, byteWidth, bitsPerPixel, bytesPerPixel, image (Buffer)
      const screen = options?.region
        ? robot.screen.capture(
            options.region.x,
            options.region.y,
            options.region.width,
            options.region.height,
          )
        : robot.screen.capture();

      // Get the screen dimensions and image buffer
      const width = screen.width;
      const height = screen.height;
      // RobotJS types define image as 'any' but it's actually a Buffer
      const screenImage = screen.image as Buffer;

      // Create a more memory-efficient pipeline using sharp
      try {
        // Use sharp's raw processing - RobotJS returns BGRA format
        let pipeline = sharp(screenImage, {
          // Tell sharp this is BGRA format (not RGBA)
          raw: { width, height, channels: 4, premultiplied: false },
        });

        // Apply immediate downsampling to reduce memory usage before any other processing
        const initialWidth = Math.min(width, mergedOptions.resize?.width || 1280);
        pipeline = pipeline.resize({
          width: initialWidth,
          withoutEnlargement: true,
        });

        // Convert BGRA to RGB (dropping alpha for smaller size)
        // Use individual channel operations instead of array
        pipeline = pipeline.removeAlpha();
        pipeline = pipeline.toColorspace('srgb');

        // Apply grayscale if requested (reduces memory further)
        if (mergedOptions.grayscale) {
          pipeline = pipeline.grayscale();
        }

        // Apply any final specific resizing if needed
        if (mergedOptions.resize?.width || mergedOptions.resize?.height) {
          pipeline = pipeline.resize({
            width: mergedOptions.resize?.width,
            height: mergedOptions.resize?.height,
            fit: mergedOptions.resize?.fit || 'inside',
            withoutEnlargement: true,
          });
        }

        // Apply appropriate format-specific compression
        if (mergedOptions.format === 'jpeg') {
          pipeline = pipeline.jpeg({
            quality: mergedOptions.quality || 70, // Lower default quality
            mozjpeg: true, // Better compression
            optimizeScans: true,
          });
        } else {
          pipeline = pipeline.png({
            compressionLevel: mergedOptions.compressionLevel || 9, // Maximum compression
            adaptiveFiltering: true,
            progressive: false,
          });
        }

        // Get the final optimized buffer
        const outputBuffer = await pipeline.toBuffer();
        const base64Data = outputBuffer.toString('base64');
        const mimeType = mergedOptions.format === 'jpeg' ? 'image/jpeg' : 'image/png';

        // Log the size of the image for debugging
        console.log(
          `Screenshot captured: ${outputBuffer.length} bytes (${Math.round(outputBuffer.length / 1024)}KB)`,
        );

        return {
          success: true,
          message: 'Screenshot captured successfully',
          content: [
            {
              type: 'image',
              data: base64Data,
              mimeType: mimeType,
            },
          ],
        };
      } catch (sharpError) {
        // Fallback with minimal processing if sharp pipeline fails
        console.error(`Sharp processing failed: ${String(sharpError)}`);

        // Create a more basic version with minimal memory usage
        return {
          success: false,
          message: `Failed to process screenshot: ${sharpError instanceof Error ? sharpError.message : String(sharpError)}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
