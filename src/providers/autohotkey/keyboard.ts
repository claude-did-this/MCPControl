import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { KeyboardAutomation } from '../../interfaces/automation.js';
import {
  MAX_TEXT_LENGTH,
  KeySchema,
  KeyCombinationSchema,
  KeyHoldOperationSchema,
} from '../../tools/validation.zod.js';
import { getAutoHotkeyPath } from './utils.js';

/**
 * AutoHotkey implementation of the KeyboardAutomation interface
 */
export class AutoHotkeyKeyboardAutomation implements KeyboardAutomation {
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
   * Convert key name to AutoHotkey format
   */
  private formatKey(key: string): string {
    const keyMap: Record<string, string> = {
      control: 'Ctrl',
      ctrl: 'Ctrl',
      shift: 'Shift',
      alt: 'Alt',
      meta: 'LWin',
      windows: 'LWin',
      enter: 'Enter',
      return: 'Enter',
      escape: 'Escape',
      esc: 'Escape',
      backspace: 'Backspace',
      delete: 'Delete',
      tab: 'Tab',
      space: 'Space',
      up: 'Up',
      down: 'Down',
      left: 'Left',
      right: 'Right',
      home: 'Home',
      end: 'End',
      pageup: 'PgUp',
      pagedown: 'PgDn',
      f1: 'F1',
      f2: 'F2',
      f3: 'F3',
      f4: 'F4',
      f5: 'F5',
      f6: 'F6',
      f7: 'F7',
      f8: 'F8',
      f9: 'F9',
      f10: 'F10',
      f11: 'F11',
      f12: 'F12',
    };

    const lowerKey = key.toLowerCase();
    return keyMap[lowerKey] || key;
  }

  typeText(input: KeyboardInput): WindowsControlResponse {
    try {
      // Validate text
      if (!input.text) {
        throw new Error('Text is required');
      }

      if (input.text.length > MAX_TEXT_LENGTH) {
        throw new Error(`Text too long: ${input.text.length} characters (max ${MAX_TEXT_LENGTH})`);
      }

      // Escape special characters for AutoHotkey
      const escapedText = input.text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '``')
        .replace(/{/g, '{{')
        .replace(/}/g, '}}');

      const script = `
        SendText("${escapedText}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Typed text successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  pressKey(key: string): WindowsControlResponse {
    try {
      // Validate key
      KeySchema.parse(key);

      const formattedKey = this.formatKey(key);
      const script = `
        Send("{${formattedKey}}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Pressed key: ${key}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
    try {
      // Validate combination
      KeyCombinationSchema.parse(combination);

      // Build the key combination string
      const keys = combination.keys.map((key) => this.formatKey(key));
      const comboString = keys.join('+');

      const script = `
        Send("{${comboString}}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Pressed key combination: ${combination.keys.join('+')}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    try {
      // Validate operation
      KeyHoldOperationSchema.parse(operation);

      const formattedKey = this.formatKey(operation.key);
      const script =
        operation.state === 'up'
          ? `
          Send("{${formattedKey} up}")
          ExitApp
        `
          : `
          Send("{${formattedKey} down}")
          ExitApp
        `;

      this.executeScript(script);

      return {
        success: true,
        message:
          operation.state === 'up'
            ? `Released key: ${operation.key}`
            : `Holding key: ${operation.key}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to ${operation.state === 'up' ? 'release' : 'hold'} key: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
