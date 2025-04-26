import { ScreenAutomation } from '../../interfaces/automation.js';
import { ScreenshotOptions } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { executePowerShellCommand, parseJsonResult } from './utils.js';

export class PowerShellScreenAutomation implements ScreenAutomation {
  private executeCommand(script: string, options: { timeout?: number, maxBuffer?: number } = {}): WindowsControlResponse {
    return executePowerShellCommand(script, options);
  }

  getScreenSize(): WindowsControlResponse {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen;
      $bounds = $screen.Bounds;
      ConvertTo-Json @{ width = $bounds.Width; height = $bounds.Height }
    `;
    const result = this.executeCommand(script);
    return parseJsonResult(result, 'Failed to parse screen size data');
  }

  getActiveWindow(): WindowsControlResponse {
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        
        public class WindowInfo {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
            
            [DllImport("user32.dll", SetLastError = true)]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
                public int Left;
                public int Top;
                public int Right;
                public int Bottom;
            }
        }
"@;
      
      $hwnd = [WindowInfo]::GetForegroundWindow();
      $title = New-Object System.Text.StringBuilder 256;
      [WindowInfo]::GetWindowText($hwnd, $title, 256) | Out-Null;
      
      $rect = New-Object WindowInfo+RECT;
      [WindowInfo]::GetWindowRect($hwnd, [ref]$rect) | Out-Null;
      
      $width = $rect.Right - $rect.Left;
      $height = $rect.Bottom - $rect.Top;
      
      ConvertTo-Json @{
        title = $title.ToString();
        position = @{ x = $rect.Left; y = $rect.Top };
        size = @{ width = $width; height = $height };
      }
    `;
    const result = this.executeCommand(script);
    return parseJsonResult(result, 'Failed to parse active window data');
  }

  focusWindow(title: string): WindowsControlResponse {
    // Escape quotes in title
    const escapedTitle = title.replace(/"/g, '`"');
    
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class WindowActivate {
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            
            [DllImport("user32.dll", SetLastError = true)]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            
            public const int SW_RESTORE = 9;
        }
"@;
      
      $windowHandle = [WindowActivate]::FindWindow($null, "${escapedTitle}");
      
      if ($windowHandle -eq [IntPtr]::Zero) {
        throw "Window with title '${escapedTitle}' not found";
      }
      
      [WindowActivate]::ShowWindow($windowHandle, [WindowActivate]::SW_RESTORE);
      $result = [WindowActivate]::SetForegroundWindow($windowHandle);
      
      if ($result) {
        "Successfully focused window with title '${escapedTitle}'";
      } else {
        throw "Failed to focus window with title '${escapedTitle}'";
      }
    `;
    return this.executeCommand(script);
  }

  async resizeWindow(title: string, width: number, height: number): Promise<WindowsControlResponse> {
    // Escape quotes in title
    const escapedTitle = title.replace(/"/g, '`"');
    
    // Using await with Promise.resolve to satisfy ESLint require-await rule
    await Promise.resolve();
    
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class WindowResize {
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
            
            [DllImport("user32.dll", SetLastError = true)]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
                public int Left;
                public int Top;
                public int Right;
                public int Bottom;
            }
        }
"@;
      
      $windowHandle = [WindowResize]::FindWindow($null, "${escapedTitle}");
      
      if ($windowHandle -eq [IntPtr]::Zero) {
        throw "Window with title '${escapedTitle}' not found";
      }
      
      $rect = New-Object WindowResize+RECT;
      [WindowResize]::GetWindowRect($windowHandle, [ref]$rect) | Out-Null;
      
      $result = [WindowResize]::MoveWindow($windowHandle, $rect.Left, $rect.Top, ${width}, ${height}, $true);
      
      if ($result) {
        "Successfully resized window '${escapedTitle}' to ${width}x${height}";
      } else {
        throw "Failed to resize window '${escapedTitle}'";
      }
    `;
    return this.executeCommand(script);
  }

  async repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse> {
    // Escape quotes in title
    const escapedTitle = title.replace(/"/g, '`"');
    
    // Using await with Promise.resolve to satisfy ESLint require-await rule
    await Promise.resolve();
    
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class WindowPosition {
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
            
            [DllImport("user32.dll", SetLastError = true)]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
                public int Left;
                public int Top;
                public int Right;
                public int Bottom;
            }
        }
"@;
      
      $windowHandle = [WindowPosition]::FindWindow($null, "${escapedTitle}");
      
      if ($windowHandle -eq [IntPtr]::Zero) {
        throw "Window with title '${escapedTitle}' not found";
      }
      
      $rect = New-Object WindowPosition+RECT;
      [WindowPosition]::GetWindowRect($windowHandle, [ref]$rect) | Out-Null;
      
      $width = $rect.Right - $rect.Left;
      $height = $rect.Bottom - $rect.Top;
      
      $result = [WindowPosition]::MoveWindow($windowHandle, ${x}, ${y}, $width, $height, $true);
      
      if ($result) {
        "Successfully moved window '${escapedTitle}' to position (${x}, ${y})";
      } else {
        throw "Failed to reposition window '${escapedTitle}'";
      }
    `;
    return this.executeCommand(script);
  }

  async getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse> {
    // Using await with Promise.resolve to satisfy ESLint require-await rule
    await Promise.resolve();
    
    try {
      // Create a temporary file to save the screenshot
      const tempDir = os.tmpdir();
      const filename = `screenshot-${Date.now()}.png`;
      const screenshotPath = path.join(tempDir, filename);
      
      // Make sure the screenshotPath is properly escaped for PowerShell
      const escapedPath = screenshotPath.replace(/\\/g, '\\\\');
      
      process.stderr.write(`Taking screenshot to: ${screenshotPath}\n`);
      
      // Simple PowerShell script for capturing screenshot
      const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing

      # Get screen bounds
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $width = $bounds.Width
      $height = $bounds.Height

      Write-Output "Capturing screenshot at $width x $height"
      
      # Create bitmap matching screen size
      $bitmap = New-Object System.Drawing.Bitmap($width, $height)
      
      # Create graphics object for bitmap
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      
      # Capture screen to bitmap
      $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
      
      # Save bitmap to file
      $bitmap.Save("${escapedPath}", [System.Drawing.Imaging.ImageFormat]::Png)
      
      # Clean up resources
      $graphics.Dispose()
      $bitmap.Dispose()
      
      # Verify file was created
      if (Test-Path "${escapedPath}") {
        $fileInfo = Get-Item "${escapedPath}"
        Write-Output "Screenshot saved: $($fileInfo.Length) bytes"
      } else {
        Write-Error "Failed to create screenshot file"
      }
      `;
      
      // Execute the PowerShell script with a higher timeout
      const result = this.executeCommand(script, { 
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024 
      });
      
      if (!result.success) {
        process.stderr.write(`PowerShell screenshot error: ${result.message}\n`);
        return result;
      }
      
      // Check if file exists
      if (!fs.existsSync(screenshotPath)) {
        process.stderr.write(`Screenshot file not found: ${screenshotPath}\n`);
        return {
          success: false,
          message: `Screenshot file not found: ${screenshotPath}`,
        };
      }
      
      // Read the screenshot file
      const screenshot = fs.readFileSync(screenshotPath);
      
      if (screenshot.length === 0) {
        return {
          success: false,
          message: 'Screenshot file is empty (0 bytes)',
        };
      }
      
      // Create a response with the screenshot data
      const response: WindowsControlResponse = {
        success: true,
        message: 'Screenshot captured successfully',
        screenshot: screenshot,
        encoding: 'binary',
        content: [
          {
            type: 'image',
            data: screenshot,
            mimeType: 'image/png',
            encoding: 'binary',
          },
        ],
      };
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(screenshotPath);
      } catch (cleanupError) {
        // Just log but don't fail if cleanup fails
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        process.stderr.write(`Failed to delete temp file: ${errorMessage}\n`);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Screenshot operation failed: ${errorMessage}`,
      };
    }
  }
}