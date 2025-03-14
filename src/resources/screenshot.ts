import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import { ScreenshotOptions } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

/**
 * Captures a screenshot with various options for optimization
 * 
 * @param options Optional configuration for the screenshot
 * @returns Promise resolving to a WindowsControlResponse with the screenshot data
 */
export async function getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse> {
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
