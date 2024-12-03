import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import { WindowInfo } from '../types/common.js';
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

    return {
      success: true,
      message: "Screenshot captured successfully",
      screenshot: base64Data
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
    
    // Get window region (position and size)
    const region = await libnut.screen.capture();
    
    const windowInfo: WindowInfo = {
      title: title,
      position: {
        x: 0, // Currently libnut doesn't provide a way to get window position
        y: 0
      },
      size: {
        width: region.width,
        height: region.height
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
