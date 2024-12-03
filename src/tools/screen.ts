import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import { WindowInfo, ImageSearchOptions, ImageSearchResult, HighlightOptions } from '../types/common.js';
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

export async function getScreenshot(region?: { x: number; y: number; width: number; height: number; }): Promise<WindowsControlResponse> {
  try {
    const screen = region ? 
      libnut.screen.capture(region.x, region.y, region.width, region.height) :
      libnut.screen.capture();

    // Convert BGRA to RGBA
    const rgbaBuffer = Buffer.alloc(screen.image.length);
    for (let i = 0; i < screen.image.length; i += 4) {
      rgbaBuffer[i] = screen.image[i + 2];     // R (from B)
      rgbaBuffer[i + 1] = screen.image[i + 1]; // G (unchanged)
      rgbaBuffer[i + 2] = screen.image[i];     // B (from R)
      rgbaBuffer[i + 3] = screen.image[i + 3]; // A (unchanged)
    }

    // Convert to PNG and get base64
    const pngBuffer = await sharp(rgbaBuffer, {
      raw: {
        width: screen.width,
        height: screen.height,
        channels: 4
      }
    })
    .png()
    .toBuffer();

    const base64Data = pngBuffer.toString('base64');

    // Return in MCP image content format
    return {
      success: true,
      message: "Screenshot captured successfully",
      content: [{
        type: "image",
        data: base64Data,
        mimeType: "image/png"
      }]
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function findImage(imagePath: string, options?: ImageSearchOptions): Promise<WindowsControlResponse> {
  try {
    const confidence = options?.confidence ?? 0.99;
    const searchRegion = options?.searchRegion;

    // Load the needle image
    const needleImage = await sharp(imagePath).raw().toBuffer();
    const needleMetadata = await sharp(imagePath).metadata();

    if (!needleMetadata.width || !needleMetadata.height) {
      throw new Error("Could not get needle image dimensions");
    }

    // Capture the screen or region
    const screen = searchRegion ?
      libnut.screen.capture(searchRegion.x, searchRegion.y, searchRegion.width, searchRegion.height) :
      libnut.screen.capture();

    // Convert screen BGRA to RGBA for matching
    const rgbaBuffer = Buffer.alloc(screen.image.length);
    for (let i = 0; i < screen.image.length; i += 4) {
      rgbaBuffer[i] = screen.image[i + 2];
      rgbaBuffer[i + 1] = screen.image[i + 1];
      rgbaBuffer[i + 2] = screen.image[i];
      rgbaBuffer[i + 3] = screen.image[i + 3];
    }

    // Perform template matching using libnut
    const result = await libnut.findImage({
      haystack: {
        data: rgbaBuffer,
        width: screen.width,
        height: screen.height
      },
      needle: {
        data: needleImage,
        width: needleMetadata.width,
        height: needleMetadata.height
      },
      confidence
    });

    if (!result) {
      return {
        success: false,
        message: "Image not found on screen"
      };
    }

    const searchResult: ImageSearchResult = {
      location: {
        x: result.x + (searchRegion?.x ?? 0),
        y: result.y + (searchRegion?.y ?? 0)
      },
      confidence: result.confidence,
      width: needleMetadata.width,
      height: needleMetadata.height
    };

    return {
      success: true,
      message: "Image found successfully",
      data: searchResult
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to find image: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function waitForImage(imagePath: string, options?: ImageSearchOptions): Promise<WindowsControlResponse> {
  try {
    const waitTime = options?.waitTime ?? 10000; // Default 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < waitTime) {
      const result = await findImage(imagePath, options);
      if (result.success) {
        return result;
      }
      // Wait a short time before next attempt
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: false,
      message: `Image not found within ${waitTime}ms timeout`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed while waiting for image: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function highlightRegion(region: { x: number; y: number; width: number; height: number; }, options?: HighlightOptions): Promise<WindowsControlResponse> {
  try {
    const duration = options?.duration ?? 1000; // Default 1 second
    const color = options?.color ?? "#ff0000"; // Default red

    // Create a transparent overlay window
    const overlayHandle = await libnut.createOverlayWindow(region.x, region.y, region.width, region.height);
    
    // Set the overlay color
    await libnut.setOverlayColor(overlayHandle, color);

    // Wait for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    // Remove the overlay
    await libnut.destroyOverlayWindow(overlayHandle);

    return {
      success: true,
      message: "Region highlighted successfully"
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to highlight region: ${error instanceof Error ? error.message : String(error)}`
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
