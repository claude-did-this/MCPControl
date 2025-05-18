import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MousePosition } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { MouseAutomation } from '../../interfaces/automation.js';
import {
  MousePositionSchema,
  MouseButtonSchema,
  ScrollAmountSchema,
} from '../../tools/validation.zod.js';
import { getAutoHotkeyPath } from './utils.js';

/**
 * AutoHotkey implementation of the MouseAutomation interface
 */
export class AutoHotkeyMouseAutomation implements MouseAutomation {
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
   * Convert mouse button to AutoHotkey format
   */
  private formatButton(button: string): string {
    const buttonMap: Record<string, string> = {
      left: 'Left',
      right: 'Right',
      middle: 'Middle',
    };

    return buttonMap[button] || button;
  }

  moveMouse(position: MousePosition): WindowsControlResponse {
    try {
      // Validate the position
      MousePositionSchema.parse(position);

      const script = `
        CoordMode("Mouse", "Screen")
        MouseMove(${position.x}, ${position.y}, 0)
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Moved mouse to position (${position.x}, ${position.y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  clickMouse(button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    try {
      // Validate button
      MouseButtonSchema.parse(button);

      const formattedButton = this.formatButton(button);
      const script = `
        Click("${formattedButton}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Clicked ${button} mouse button`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  doubleClick(position?: MousePosition): WindowsControlResponse {
    try {
      let script: string;

      if (position) {
        MousePositionSchema.parse(position);
        script = `
          CoordMode("Mouse", "Screen")
          MouseMove(${position.x}, ${position.y}, 0)
          Click("Left 2")
          ExitApp
        `;
      } else {
        script = `
          Click("Left 2")
          ExitApp
        `;
      }

      this.executeScript(script);

      return {
        success: true,
        message: position
          ? `Double-clicked at position (${position.x}, ${position.y})`
          : 'Double-clicked at current position',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double-click mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  pressMouse(button: string = 'left'): WindowsControlResponse {
    try {
      // Validate button
      MouseButtonSchema.parse(button);

      const formattedButton = this.formatButton(button);
      const script = `
        Click("${formattedButton} Down")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Pressed ${button} mouse button`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press mouse button: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  releaseMouse(button: string = 'left'): WindowsControlResponse {
    try {
      // Validate button
      MouseButtonSchema.parse(button);

      const formattedButton = this.formatButton(button);
      const script = `
        Click("${formattedButton} Up")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Released ${button} mouse button`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to release mouse button: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  scrollMouse(amount: number): WindowsControlResponse {
    try {
      // Validate amount
      ScrollAmountSchema.parse(amount);

      // Convert direction to AutoHotkey format
      const direction = amount > 0 ? 'up' : 'down';
      const wheelDirection = amount > 0 ? 'WheelUp' : 'WheelDown';
      const steps = Math.abs(amount);

      const script = `
        Loop ${steps} {
          Send("{${wheelDirection}}")
        }
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Scrolled ${direction} ${steps} times`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to scroll mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getCursorPosition(): WindowsControlResponse {
    try {
      // Create a more complex script that writes the position to stdout
      const outputPath = join(tmpdir(), `mcp-ahk-output-${Date.now()}.txt`);
      const script = `
        CoordMode("Mouse", "Screen")
        MouseGetPos(&x, &y)
        FileAppend(x . "," . y, "${outputPath}")
        ExitApp
      `;

      const scriptPath = join(tmpdir(), `mcp-ahk-${Date.now()}.ahk`);

      try {
        writeFileSync(scriptPath, script, 'utf8');
        execSync(`AutoHotkey.exe "${scriptPath}"`, { stdio: 'pipe' });

        // Read the output
        const output = readFileSync(outputPath, 'utf8');
        const [x, y] = output.split(',').map(Number);

        return {
          success: true,
          message: 'Retrieved cursor position',
          data: { position: { x, y } },
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
        message: `Failed to get mouse position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  dragMouse(
    from: MousePosition,
    to: MousePosition,
    button: 'left' | 'right' | 'middle' = 'left',
  ): WindowsControlResponse {
    try {
      MousePositionSchema.parse(from);
      MousePositionSchema.parse(to);
      MouseButtonSchema.parse(button);

      const formattedButton = this.formatButton(button);
      const script = `
        CoordMode("Mouse", "Screen")
        MouseMove(${from.x}, ${from.y}, 0)
        Click("${formattedButton} Down")
        MouseMove(${to.x}, ${to.y}, 10)
        Click("${formattedButton} Up")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Dragged from (${from.x}, ${from.y}) to (${to.x}, ${to.y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  clickAt(
    x: number,
    y: number,
    button: 'left' | 'right' | 'middle' = 'left',
  ): WindowsControlResponse {
    try {
      MouseButtonSchema.parse(button);

      const position = { x, y };
      MousePositionSchema.parse(position);

      const formattedButton = this.formatButton(button);
      const script = `
        CoordMode("Mouse", "Screen")
        Click(${x}, ${y}, "${formattedButton}")
        ExitApp
      `;

      this.executeScript(script);

      return {
        success: true,
        message: `Clicked ${button} at (${x}, ${y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
