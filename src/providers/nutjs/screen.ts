import libnut from '@nut-tree-fork/libnut';
import sharp from 'sharp';
import { WindowInfo, ScreenshotOptions } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { ScreenAutomation } from '../../interfaces/automation.js';

/**
 * NutJS implementation of the ScreenAutomation interface
 */
export class NutJSScreenAutomation implements ScreenAutomation {
  /**
   * Gets the current screen dimensions
   * @returns WindowsControlResponse with width and height of the screen
   */
  getScreenSize(): WindowsControlResponse {
    try {
      const screen = libnut.screen.capture() as { width: number; height: number; image: Buffer };

      return {
        success: true,
        message: 'Screen size retrieved successfully',
        data: {
          width: screen.width,
          height: screen.height,
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
   */
  getActiveWindow(): WindowsControlResponse {
    try {
      const handle = libnut.getActiveWindow();
      const title = libnut.getWindowTitle(handle);
      const rect = libnut.getWindowRect(handle);

      const windowInfo: WindowInfo = {
        title: title,
        position: { x: rect.x, y: rect.y },
        size: { width: rect.width, height: rect.height },
      };

      return {
        success: true,
        message: 'Active window information retrieved successfully',
        data: windowInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active window information: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Brings a window to the foreground by searching for a window with the given title
   * @param title - The title or partial title of the window to focus
   * @returns WindowsControlResponse indicating success or failure
   */
  focusWindow(title: string): WindowsControlResponse {
    try {
      const handles = libnut.getWindows();

      for (const handle of handles) {
        try {
          const windowTitle = libnut.getWindowTitle(handle);
          if (windowTitle.includes(title)) {
            libnut.focusWindow(handle);
            return {
              success: true,
              message: `Successfully focused window: ${title}`,
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to focus window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Resizes a window to the specified dimensions
   * @param title - The title or partial title of the window to resize
   * @param width - The new width of the window in pixels
   * @param height - The new height of the window in pixels
   * @returns WindowsControlResponse indicating success or failure
   */
  async resizeWindow(
    title: string,
    width: number,
    height: number,
  ): Promise<WindowsControlResponse> {
    try {
      const handles = libnut.getWindows();

      for (const handle of handles) {
        try {
          const windowTitle = libnut.getWindowTitle(handle);
          if (windowTitle.includes(title)) {
            libnut.resizeWindow(handle, { width, height });
            return {
              success: true,
              message: `Successfully resized window: ${title} to ${width}x${height}`,
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to resize window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Moves a window to the specified screen coordinates
   * @param title - The title or partial title of the window to reposition
   * @param x - The new x-coordinate of the window in pixels
   * @param y - The new y-coordinate of the window in pixels
   * @returns WindowsControlResponse indicating success or failure
   */
  async repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse> {
    try {
      const handles = libnut.getWindows();

      for (const handle of handles) {
        try {
          const windowTitle = libnut.getWindowTitle(handle);
          if (windowTitle.includes(title)) {
            libnut.moveWindow(handle, { x, y });
            return {
              success: true,
              message: `Successfully repositioned window: ${title} to (${x},${y})`,
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reposition window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
      const screen = options?.region
        ? (libnut.screen.capture(
            options.region.x,
            options.region.y,
            options.region.width,
            options.region.height,
          ) as { width: number; height: number; image: Buffer })
        : (libnut.screen.capture() as { width: number; height: number; image: Buffer });

      // Get the screen dimensions and image buffer with proper typing
      const width = screen.width;
      const height = screen.height;
      const screenImage = screen.image;

      // Create a more memory-efficient pipeline using sharp
      try {
        // Use sharp's raw processing - eliminates need for manual RGBA conversion
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
