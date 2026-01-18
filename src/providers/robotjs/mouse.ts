import robot from '@jitsi/robotjs';
import { MousePosition, ButtonMap } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { MouseAutomation } from '../../interfaces/automation.js';

const buttonMap: ButtonMap = {
  left: 'left',
  right: 'right',
  middle: 'middle',
};

/**
 * RobotJS implementation of the MouseAutomation interface
 */
export class RobotJSMouseAutomation implements MouseAutomation {
  moveMouse(position: MousePosition): WindowsControlResponse {
    if (
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      isNaN(position.x) ||
      isNaN(position.y)
    ) {
      return {
        success: false,
        message: 'Invalid coordinates provided',
      };
    }

    try {
      robot.moveMouse(position.x, position.y);
      return {
        success: true,
        message: `Mouse moved to position (${position.x}, ${position.y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  clickMouse(button: keyof ButtonMap = 'left'): WindowsControlResponse {
    try {
      const buttonName = buttonMap[button];
      robot.mouseClick(buttonName);
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
      if (position) {
        robot.moveMouse(position.x, position.y);
      }
      robot.mouseClick('left', true); // Use the built-in double click parameter
      return {
        success: true,
        message: position
          ? `Double clicked at position (${position.x}, ${position.y})`
          : 'Double clicked at current position',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double click: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getCursorPosition(): WindowsControlResponse {
    try {
      const position = robot.getMousePos();
      return {
        success: true,
        message: 'Cursor position retrieved successfully',
        data: {
          x: position.x,
          y: position.y,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  scrollMouse(amount: number): WindowsControlResponse {
    try {
      robot.scrollMouse(0, amount); // x is 0 for vertical scrolling
      return {
        success: true,
        message: `Scrolled mouse ${amount > 0 ? 'down' : 'up'} by ${Math.abs(amount)} units`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to scroll mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  dragMouse(
    from: MousePosition,
    to: MousePosition,
    button: keyof ButtonMap = 'left',
  ): WindowsControlResponse {
    if (
      typeof from.x !== 'number' ||
      typeof from.y !== 'number' ||
      isNaN(from.x) ||
      isNaN(from.y) ||
      typeof to.x !== 'number' ||
      typeof to.y !== 'number' ||
      isNaN(to.x) ||
      isNaN(to.y)
    ) {
      return {
        success: false,
        message: 'Invalid coordinates provided',
      };
    }

    try {
      const buttonName = buttonMap[button];

      // Move to start position
      robot.moveMouse(from.x, from.y);

      // Press mouse button
      robot.mouseToggle('down', buttonName);

      // Move to end position
      robot.moveMouse(to.x, to.y);

      // Release mouse button
      robot.mouseToggle('up', buttonName);

      return {
        success: true,
        message: `Dragged from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) with ${button} button`,
      };
    } catch (error) {
      // Ensure mouse button is released in case of error
      try {
        robot.mouseToggle('up', buttonMap[button]);
      } catch (cleanupError) {
        // Log cleanup errors - in a real implementation, you would use your logging system
        console.error(
          'Failed to release mouse button after drag error:',
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        );
      }

      return {
        success: false,
        message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  clickAt(x: number, y: number, button: keyof ButtonMap = 'left'): WindowsControlResponse {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      return {
        success: false,
        message: 'Invalid coordinates provided',
      };
    }
    try {
      // Store original position
      const originalPosition = robot.getMousePos();

      // Move to target position
      robot.moveMouse(x, y);

      // Perform click
      robot.mouseClick(buttonMap[button]);

      // Return to original position
      robot.moveMouse(originalPosition.x, originalPosition.y);

      return {
        success: true,
        message: `Clicked ${button} button at position (${x}, ${y}) and returned to (${originalPosition.x}, ${originalPosition.y})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
