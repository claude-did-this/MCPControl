import libnut from '@nut-tree/libnut';
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
      const screen = libnut.screen.capture();
      
      return {
        success: true,
        message: "Screen size retrieved successfully",
        data: {
          width: screen.width,
          height: screen.height
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get screen size: ${error instanceof Error ? error.message : String(error)}`
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
        size: { width: rect.width, height: rect.height }
      };

      return {
        success: true,
        message: "Active window information retrieved successfully",
        data: windowInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active window information: ${error instanceof Error ? error.message : String(error)}`
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
              message: `Successfully focused window: ${title}`
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to focus window: ${error instanceof Error ? error.message : String(error)}`
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
  resizeWindow(title: string, width: number, height: number): WindowsControlResponse {
    try {
      const handles = libnut.getWindows();
      
      for (const handle of handles) {
        try {
          const windowTitle = libnut.getWindowTitle(handle);
          if (windowTitle.includes(title)) {
            libnut.resizeWindow(handle, { width, height });
            return {
              success: true,
              message: `Successfully resized window: ${title} to ${width}x${height}`
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to resize window: ${error instanceof Error ? error.message : String(error)}`
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
  repositionWindow(title: string, x: number, y: number): WindowsControlResponse {
    try {
      const handles = libnut.getWindows();
      
      for (const handle of handles) {
        try {
          const windowTitle = libnut.getWindowTitle(handle);
          if (windowTitle.includes(title)) {
            libnut.moveWindow(handle, { x, y });
            return {
              success: true,
              message: `Successfully repositioned window: ${title} to (${x},${y})`
            };
          }
        } catch {
          continue;
        }
      }

      return {
        success: false,
        message: `Could not find window with title: ${title}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reposition window: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Captures a screenshot of the entire screen or a specific region
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
      // Capture screen or region
      const screen = options?.region ? 
        libnut.screen.capture(options.region.x, options.region.y, options.region.width, options.region.height) :
        libnut.screen.capture();

      // Convert BGRA to RGBA
      const screenImage = screen.image as Buffer;
      const rgbaBuffer = Buffer.alloc(screenImage.length);
      for (let i = 0; i < screenImage.length; i += 4) {
        rgbaBuffer[i] = screenImage[i + 2];     // R (from B)
        rgbaBuffer[i + 1] = screenImage[i + 1]; // G (unchanged)
        rgbaBuffer[i + 2] = screenImage[i];     // B (from R)
        rgbaBuffer[i + 3] = screenImage[i + 3]; // A (unchanged)
      }

      // Process image with Sharp
      let pipeline = sharp(rgbaBuffer, {
        raw: { width: screen.width, height: screen.height, channels: 4 }
      });

      if (options?.grayscale) pipeline = pipeline.grayscale();
      
      if (options?.resize) {
        pipeline = pipeline.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'contain',
          withoutEnlargement: true
        });
      }

      // Format options
      if (options?.format === 'jpeg') {
        pipeline = pipeline.jpeg({
          quality: options?.quality || 80,
          mozjpeg: true
        });
      } else {
        pipeline = pipeline.png({
          compressionLevel: options?.compressionLevel || 6,
          adaptiveFiltering: true
        });
      }

      // Get the final buffer
      const outputBuffer = await pipeline.toBuffer();
      const base64Data = outputBuffer.toString('base64');
      const mimeType = options?.format === 'jpeg' ? "image/jpeg" : "image/png";

      return {
        success: true,
        message: "Screenshot captured successfully",
        content: [{
          type: "image",
          data: base64Data,
          mimeType: mimeType
        }]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}