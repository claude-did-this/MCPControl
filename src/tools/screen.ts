import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import { WindowInfo, ScreenshotOptions } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

export async function getScreenSize(): Promise<WindowsControlResponse> {
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

export async function getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse> {
  try {
    // Capture screen or region
    const screen = options?.region ? 
      libnut.screen.capture(options.region.x, options.region.y, options.region.width, options.region.height) :
      libnut.screen.capture();

    // Convert BGRA to RGBA
    const rgbaBuffer = Buffer.alloc(screen.image.length);
    for (let i = 0; i < screen.image.length; i += 4) {
      rgbaBuffer[i] = screen.image[i + 2];     // R (from B)
      rgbaBuffer[i + 1] = screen.image[i + 1]; // G (unchanged)
      rgbaBuffer[i + 2] = screen.image[i];     // B (from R)
      rgbaBuffer[i + 3] = screen.image[i + 3]; // A (unchanged)
    }

    // Start building the Sharp pipeline
    let pipeline = sharp(rgbaBuffer, {
      raw: {
        width: screen.width,
        height: screen.height,
        channels: 4
      }
    });

    // Apply grayscale if requested
    if (options?.grayscale) {
      pipeline = pipeline.grayscale();
    }

    // Apply resize if requested
    if (options?.resize) {
      pipeline = pipeline.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'contain',
        withoutEnlargement: true
      });
    }

    // Convert to requested format with compression options
    if (options?.format === 'jpeg') {
      pipeline = pipeline.jpeg({
        quality: options?.quality || 80,
        mozjpeg: true // Use mozjpeg for better compression
      });
    } else {
      // Default to PNG with optional compression
      pipeline = pipeline.png({
        compressionLevel: options?.compressionLevel || 6,
        adaptiveFiltering: true
      });
    }

    // Get the final buffer
    const outputBuffer = await pipeline.toBuffer();
    const base64Data = outputBuffer.toString('base64');

    // Return in MCP image content format
    return {
      success: true,
      message: "Screenshot captured successfully",
      content: [{
        type: "image",
        data: base64Data,
        mimeType: options?.format === 'jpeg' ? "image/jpeg" : "image/png"
      }]
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function getActiveWindow(): Promise<WindowsControlResponse> {
  try {
    // Get the active window handle
    const handle = await libnut.getActiveWindow();
    
    // Get window title
    const title = await libnut.getWindowTitle(handle);
    
    // Get window position and size using getWindowRect
    const rect = await libnut.getWindowRect(handle);
    
    const windowInfo: WindowInfo = {
      title: title,
      position: {
        x: rect.x,
        y: rect.y
      },
      size: {
        width: rect.width,
        height: rect.height
      }
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

export async function listAllWindows(): Promise<WindowsControlResponse> {
  try {
    // Get all window handles
    const handles = await libnut.getWindows();
    
    // Get information for each window
    const windowsWithNull = await Promise.all(
      handles.map(async (handle) => {
        try {
          const title = await libnut.getWindowTitle(handle);
          const rect = await libnut.getWindowRect(handle);
          
          return {
            title: title,
            position: {
              x: rect.x,
              y: rect.y
            },
            size: {
              width: rect.width,
              height: rect.height
            }
          } as WindowInfo;
        } catch (error) {
          // Skip windows that can't be accessed
          return null;
        }
      })
    );

    // Filter out null values from inaccessible windows
    const windows = windowsWithNull.filter((window): window is WindowInfo => window !== null);

    return {
      success: true,
      message: "Window list retrieved successfully",
      data: windows
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list windows: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function focusWindow(title: string): Promise<WindowsControlResponse> {
  try {
    // Get all windows
    const handles = await libnut.getWindows();
    
    // Find the window with matching title
    for (const handle of handles) {
      try {
        const windowTitle = await libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          await libnut.focusWindow(handle);
          return {
            success: true,
            message: `Successfully focused window: ${title}`
          };
        }
      } catch (error) {
        continue; // Skip windows that can't be accessed
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

export async function resizeWindow(title: string, width: number, height: number): Promise<WindowsControlResponse> {
  try {
    // Get all windows
    const handles = await libnut.getWindows();
    
    // Find the window with matching title
    for (const handle of handles) {
      try {
        const windowTitle = await libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          await libnut.resizeWindow(handle, { width, height });
          return {
            success: true,
            message: `Successfully resized window: ${title}`
          };
        }
      } catch (error) {
        continue; // Skip windows that can't be accessed
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

export async function repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse> {
  try {
    // Get all windows
    const handles = await libnut.getWindows();
    
    // Find the window with matching title
    for (const handle of handles) {
      try {
        const windowTitle = await libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          await libnut.moveWindow(handle, { x, y });
          return {
            success: true,
            message: `Successfully repositioned window: ${title}`
          };
        }
      } catch (error) {
        continue; // Skip windows that can't be accessed
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

// Note: minimize and restore operations are not currently supported by libnut-core
export async function minimizeWindow(title: string): Promise<WindowsControlResponse> {
  return {
    success: false,
    message: "Window minimizing is not currently supported by the underlying library"
  };
}

export async function restoreWindow(title: string): Promise<WindowsControlResponse> {
  return {
    success: false,
    message: "Window restoring is not currently supported by the underlying library"
  };
}
