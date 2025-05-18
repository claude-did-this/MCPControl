import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WindowsControlResponse } from '../../types/responses.js';
import { ScreenAutomation } from '../../interfaces/automation.js';
import { getAutoHotkeyPath } from './utils.js';

// Maximum size for screenshots in pixels
const MAX_SIZE_PIXELS = 10000000;

/**
 * AutoHotkey implementation of the ScreenAutomation interface
 */
export class AutoHotkeyScreenAutomation implements ScreenAutomation {
  /**
   * Execute an AutoHotkey script
   */
  private executeScript(script: string): void {
    const scriptPath = join(tmpdir(), `mcp-ahk-${Date.now()}.ahk`);

    try {
      // Write the script to a temporary file
      writeFileSync(scriptPath, script, 'utf8');

      // Execute the script with AutoHotkey v2
      const autohotkeyPath = getAutoHotkeyPath();
      execSync(`"${autohotkeyPath}" "${scriptPath}"`, { stdio: 'pipe' });
    } finally {
      // Clean up the temporary script file
      try {
        unlinkSync(scriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute a script and return output from a temporary file
   * @param script The AutoHotkey script to execute
   * @param _outputPath The path embedded in the script for output (not used directly in this method)
   */
  private executeScriptWithOutput(script: string, _outputPath: string): void {
    // _outputPath is used within the script content, not directly here
    const scriptPath = join(tmpdir(), `mcp-ahk-${Date.now()}.ahk`);

    try {
      writeFileSync(scriptPath, script, 'utf8');
      const autohotkeyPath = getAutoHotkeyPath();
      execSync(`"${autohotkeyPath}" "${scriptPath}"`, { stdio: 'pipe' });
    } finally {
      try {
        unlinkSync(scriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  getScreenSize(): WindowsControlResponse {
    try {
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        width := A_ScreenWidth
        height := A_ScreenHeight
        FileAppend(width . "," . height, "${outputPath}")
        ExitApp
      `;

      this.executeScriptWithOutput(script, outputPath);

      try {
        const output = readFileSync(outputPath, 'utf8');
        const [width, height] = output.split(',').map(Number);

        return {
          success: true,
          message: `Screen size: ${width}x${height}`,
          data: { width, height },
        };
      } finally {
        try {
          unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get screen size: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  captureScreenshot(
    region?: { x: number; y: number; width: number; height: number },
    format: string = 'png',
  ): WindowsControlResponse {
    try {
      // Validate inputs
      if (region) {
        // Basic validation - check for undefined/null values and non-positive dimensions
        if (
          region.x === undefined ||
          region.x === null ||
          region.y === undefined ||
          region.y === null ||
          region.width === undefined ||
          region.width === null ||
          region.width <= 0 ||
          region.height === undefined ||
          region.height === null ||
          region.height <= 0
        ) {
          throw new Error('Invalid region');
        }
        const totalPixels = region.width * region.height;
        if (totalPixels > MAX_SIZE_PIXELS) {
          throw new Error(
            `Screenshot region too large: ${totalPixels} pixels (max ${MAX_SIZE_PIXELS})`,
          );
        }
      }
      // Basic format validation
      if (!['png', 'jpg', 'jpeg', 'bmp'].includes(format.toLowerCase())) {
        throw new Error('Invalid format');
      }

      const timestamp = Date.now();
      const filePath = join(tmpdir(), `screenshot-${timestamp}.${format}`);
      let script: string;

      if (region) {
        // Capture specific region
        script = `
          ; Using ImagePutFile from ImagePut library
          ; This would require the ImagePut library to be available
          ; For now, we'll use a basic approach with Windows built-in functionality
          
          ; TODO: Implement proper screenshot capture for regions
          ; This is a placeholder that captures the full screen
          Run("mspaint.exe")
          Sleep(1000)
          Send("^{PrintScreen}")
          Sleep(500)
          Send("^s")
          Sleep(500)
          SendText("${filePath}")
          Sleep(500)
          Send("{Enter}")
          Sleep(1000)
          Send("!{F4}")
          ExitApp
        `;
      } else {
        // Capture full screen using Windows built-in functionality
        script = `
          ; Simple approach using Windows clipboard
          Send("{PrintScreen}")
          Sleep(100)
          
          ; Open Paint to save the screenshot
          Run("mspaint.exe")
          Sleep(1000)
          Send("^v")
          Sleep(500)
          Send("^s")
          Sleep(500)
          SendText("${filePath}")
          Sleep(500)
          Send("{Enter}")
          Sleep(1000)
          Send("!{F4}")
          ExitApp
        `;
      }

      this.executeScript(script);

      // Read the screenshot file
      const buffer = readFileSync(filePath);

      // Calculate metadata
      const size = buffer.length;
      const regionInfo = region || { x: 0, y: 0, width: 0, height: 0 };

      // Clean up the temporary file
      try {
        unlinkSync(filePath);
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: true,
        message: 'Screenshot captured',
        data: {
          base64: buffer.toString('base64'),
          format,
          region: regionInfo,
          size,
          timestamp: new Date(timestamp).toISOString(),
          filePath,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getPixelColor(x: number, y: number): WindowsControlResponse {
    try {
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        CoordMode("Pixel", "Screen")
        color := PixelGetColor(${x}, ${y}, "RGB")
        ; Convert from BGR to RGB format
        r := (color & 0xFF)
        g := ((color >> 8) & 0xFF)
        b := ((color >> 16) & 0xFF)
        
        ; Convert to hex format
        hex := Format("#{:02X}{:02X}{:02X}", r, g, b)
        
        FileAppend(hex . "," . r . "," . g . "," . b, "${outputPath}")
        ExitApp
      `;

      this.executeScriptWithOutput(script, outputPath);

      try {
        const output = readFileSync(outputPath, 'utf8');
        const [hex, r, g, b] = output.split(',');

        return {
          success: true,
          message: 'Retrieved pixel color',
          data: {
            hex,
            rgb: {
              r: parseInt(r),
              g: parseInt(g),
              b: parseInt(b),
            },
            position: { x, y },
          },
        };
      } finally {
        try {
          unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get pixel color: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getActiveWindow(): WindowsControlResponse {
    try {
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        hwnd := WinGetID("A")
        title := WinGetTitle("ahk_id " . hwnd)
        WinGetPos(&x, &y, &width, &height, "ahk_id " . hwnd)
        
        FileAppend(title . "|" . x . "|" . y . "|" . width . "|" . height, "${outputPath}")
        ExitApp
      `;

      const scriptPath = join(tmpdir(), `mcp-ahk-${Date.now()}.ahk`);

      try {
        writeFileSync(scriptPath, script, 'utf8');
        const autohotkeyPath = getAutoHotkeyPath();
        execSync(`"${autohotkeyPath}" "${scriptPath}"`, { stdio: 'pipe' });

        // Read the output
        const output = readFileSync(outputPath, 'utf8');
        const [title, x, y, width, height] = output.split('|');

        return {
          success: true,
          message: 'Retrieved active window',
          data: {
            title,
            position: { x: Number(x), y: Number(y) },
            size: { width: Number(width), height: Number(height) },
          },
        };
      } finally {
        // Clean up
        try {
          unlinkSync(scriptPath);
          unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  focusWindow(title: string): WindowsControlResponse {
    try {
      const script = `
        WinActivate("${title}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Focused window: ${title}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to focus window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async resizeWindow(
    title: string,
    width: number,
    height: number,
  ): Promise<WindowsControlResponse> {
    try {
      const script = `
        WinMove("${title}", , , , ${width}, ${height})
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Resized window "${title}" to ${width}x${height}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to resize window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse> {
    try {
      const script = `
        WinMove("${title}", , ${x}, ${y})
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Repositioned window "${title}" to (${x}, ${y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reposition window: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getScreenshot(options?: {
    region?: { x: number; y: number; width: number; height: number };
  }): Promise<WindowsControlResponse> {
    // Delegate to the synchronous captureScreenshot method
    const result = await Promise.resolve(this.captureScreenshot(options?.region, 'png'));
    return result;
  }
}
