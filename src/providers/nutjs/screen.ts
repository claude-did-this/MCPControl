import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import { WindowInfo, ScreenshotOptions } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { ScreenAutomation } from '../../interfaces/automation.js';

/**
 * NutJS implementation of the ScreenAutomation interface
 */
export class NutJSScreenAutomation implements ScreenAutomation {
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