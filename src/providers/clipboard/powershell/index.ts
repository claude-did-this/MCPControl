import { exec } from 'child_process';
import { promisify } from 'util';
import { ClipboardInput } from '../../../types/common.js';
import { WindowsControlResponse } from '../../../types/responses.js';
import { ClipboardAutomation } from '../../../interfaces/automation.js';

const execAsync = promisify(exec);

/**
 * PowerShell implementation of the ClipboardAutomation interface
 *
 * Uses PowerShell commands for clipboard operations on Windows
 * NOTE: This provider is Windows-only
 */
export class PowerShellClipboardProvider implements ClipboardAutomation {
  private async executePowerShell(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`powershell.exe -Command "${command}"`);
      if (stderr) {
        throw new Error(stderr);
      }
      return stdout.trim();
    } catch (error) {
      throw new Error(
        `PowerShell execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getClipboardContent(): Promise<WindowsControlResponse> {
    try {
      const content = await this.executePowerShell('Get-Clipboard');
      return {
        success: true,
        message: 'Clipboard content retrieved',
        data: content,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get clipboard content: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async setClipboardContent(input: ClipboardInput): Promise<WindowsControlResponse> {
    try {
      // Escape quotes in the text for PowerShell
      const escapedText = input.text.replace(/"/g, '`"');
      await this.executePowerShell(`Set-Clipboard -Value "${escapedText}"`);
      return {
        success: true,
        message: 'Clipboard content set',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to set clipboard content: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async hasClipboardText(): Promise<WindowsControlResponse> {
    try {
      const content = await this.executePowerShell('Get-Clipboard');
      const hasText = content.length > 0;
      return {
        success: true,
        message: `Clipboard ${hasText ? 'has' : 'does not have'} text`,
        data: hasText,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to check clipboard: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async clearClipboard(): Promise<WindowsControlResponse> {
    try {
      await this.executePowerShell('Set-Clipboard -Value ""');
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
