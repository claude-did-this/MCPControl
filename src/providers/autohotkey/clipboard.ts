import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WindowsControlResponse } from '../../types/responses.js';
import { ClipboardAutomation } from '../../interfaces/automation.js';
import { ClipboardInput } from '../../types/common.js';
import { getAutoHotkeyPath } from './utils.js';

/**
 * AutoHotkey implementation of the ClipboardAutomation interface
 */
export class AutoHotkeyClipboardAutomation implements ClipboardAutomation {
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
   */
  private executeScriptWithOutput(script: string, _outputPath: string): void {
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async setClipboardContent(input: ClipboardInput): Promise<WindowsControlResponse> {
    try {
      // Escape special characters
      const escapedText = input.text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '``')
        .replace(/{/g, '{{')
        .replace(/}/g, '}}');

      const script = `
        A_Clipboard := "${escapedText}"
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: 'Text copied to clipboard',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // This method is not part of the interface - removing it
  /*
  paste(): WindowsControlResponse {
    try {
      const script = `
        Send("^v")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: 'Pasted from clipboard',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to paste from clipboard: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  */

  // eslint-disable-next-line @typescript-eslint/require-await
  async hasClipboardText(): Promise<WindowsControlResponse> {
    try {
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        hasText := A_Clipboard != ""
        FileAppend(hasText ? "true" : "false", "${outputPath}")
        ExitApp
      `;

      this.executeScriptWithOutput(script, outputPath);

      try {
        const result = readFileSync(outputPath, 'utf8');
        const hasText = result === 'true';

        return {
          success: true,
          message: hasText ? 'Clipboard contains text' : 'Clipboard is empty',
          data: { hasText },
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
        message: `Failed to check clipboard content: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getClipboardContent(): Promise<WindowsControlResponse> {
    try {
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        content := A_Clipboard
        FileAppend(content, "${outputPath}")
        ExitApp
      `;

      this.executeScriptWithOutput(script, outputPath);

      try {
        const content = readFileSync(outputPath, 'utf8');
        return {
          success: true,
          message: 'Retrieved clipboard content',
          data: { text: content },
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
        message: `Failed to read from clipboard: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async clearClipboard(): Promise<WindowsControlResponse> {
    try {
      const script = `
        A_Clipboard := ""
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: 'Clipboard cleared',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear clipboard: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
