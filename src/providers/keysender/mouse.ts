import pkg from 'keysender';
const { Hardware, getScreenSize: keysenderGetScreenSize } = pkg;

// Mouse button handled by validation
import { MousePosition } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { MouseAutomation } from '../../interfaces/automation.js';
import {
  MousePositionSchema,
  MouseButtonSchema,
  ScrollAmountSchema,
} from '../../tools/validation.zod.js';

/**
 * Keysender implementation of the MouseAutomation interface
 */
export class KeysenderMouseAutomation implements MouseAutomation {
  private mouse = new Hardware().mouse;

  /**
   * Validates mouse position against screen bounds including actual screen size
   * @param position Position to validate
   * @returns Validated position
   * @throws Error if position is invalid or out of bounds
   */
  private validatePositionAgainstScreen(position: MousePosition): MousePosition {
    // First run the basic validation
    MousePositionSchema.parse(position);

    // Then check against actual screen bounds
    const screenSize = keysenderGetScreenSize();
    if (
      position.x < 0 ||
      position.x >= screenSize.width ||
      position.y < 0 ||
      position.y >= screenSize.height
    ) {
      throw new Error(
        `Position (${position.x},${position.y}) is outside screen bounds (0,0)-(${screenSize.width - 1},${screenSize.height - 1})`,
      );
    }

    return position;
  }

  moveMouse(position: MousePosition): WindowsControlResponse {
    try {
      // Validate the position against screen bounds
      this.validatePositionAgainstScreen(position);

      // Start the asynchronous operation and handle errors properly
      this.mouse.moveTo(position.x, position.y).catch((err) => {
        console.error(`Error moving mouse to position ${position.x},${position.y}:`, err);
        // We can't update the response after it's returned, but at least log the error
      });

      return {
        success: true,
        message: `Moved mouse to position: x=${position.x}, y=${position.y}`,
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
      // Validate button using Zod schema
      MouseButtonSchema.parse(button);
      const mouseButton = button;

      // Start the asynchronous operation and handle errors properly
      this.mouse.click(mouseButton).catch((err) => {
        console.error(`Error clicking ${button} button:`, err);
        // We can't update the response after it's returned, but at least log the error
      });

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
      // Move to position first if provided
      if (position) {
        // Validate position against screen bounds
        this.validatePositionAgainstScreen(position);

        this.mouse.moveTo(position.x, position.y).catch((err) => {
          console.error(`Error moving mouse to position ${position.x},${position.y}:`, err);
          throw err; // Re-throw to be caught by the outer try/catch
        });
      }

      // Double click by clicking twice with proper error handling
      this.mouse
        .click()
        .then(() => {
          // Add a small delay between clicks
          setTimeout(() => {
            this.mouse
              .click()
              .catch((err) => console.error('Error on second click of double-click:', err));
          }, 50);
        })
        .catch((err) => console.error('Error on first click of double-click:', err));

      return {
        success: true,
        message: position
          ? 'Double-clicked at position: x=' + position.x + ', y=' + position.y
          : 'Double-clicked at current position',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double-click: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  getCursorPosition(): WindowsControlResponse {
    try {
      // Get current position
      const pos = this.mouse.getPos();
      const position = { x: pos.x, y: pos.y };
      return {
        success: true,
        message: `Current cursor position: x=${position.x}, y=${position.y}`,
        data: position,
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
      // Validate amount using Zod schema
      ScrollAmountSchema.parse(amount);

      // Start the asynchronous operation and handle errors properly
      this.mouse.scrollWheel(amount).catch((err) => {
        console.error(`Error scrolling mouse by ${amount}:`, err);
        // We can't update the response after it's returned, but at least log the error
      });

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
    button: 'left' | 'right' | 'middle' = 'left',
  ): WindowsControlResponse {
    try {
      // Validate positions against screen bounds
      this.validatePositionAgainstScreen(from);
      this.validatePositionAgainstScreen(to);

      // Validate button using Zod schema
      MouseButtonSchema.parse(button);
      const mouseButton = button;

      // Start the drag operation
      // Move to start position
      this.mouse
        .moveTo(from.x, from.y)
        .then(() => {
          // Press mouse button down
          this.mouse
            .toggle(mouseButton, true)
            .then(() => {
              // Small delay to ensure button is pressed
              setTimeout(() => {
                // Move to end position
                this.mouse
                  .moveTo(to.x, to.y)
                  .then(() => {
                    // Release mouse button
                    this.mouse
                      .toggle(mouseButton, false)
                      .catch((err) => console.error(`Error releasing ${button} button:`, err));
                  })
                  .catch((err) => {
                    console.error(`Error moving mouse to end position ${to.x},${to.y}:`, err);
                    // Ensure button is released even if move fails
                    this.mouse
                      .toggle(mouseButton, false)
                      .catch((releaseErr) =>
                        console.error(`Error releasing ${button} button:`, releaseErr),
                      );
                  });
              }, 50);
            })
            .catch((err) => console.error(`Error pressing ${button} button down:`, err));
        })
        .catch((err) =>
          console.error(`Error moving mouse to start position ${from.x},${from.y}:`, err),
        );

      return {
        success: true,
        message: `Dragged mouse from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) using ${button} button`,
      };
    } catch (error) {
      // Ensure mouse button is released in case of error
      try {
        MouseButtonSchema.parse(button);
        const mouseButton = button;
        this.mouse
          .toggle(mouseButton, false)
          .catch((err) => console.error(`Error releasing ${button} button during cleanup:`, err));
      } catch (releaseError) {
        console.error(`Error during cleanup:`, releaseError);
        // Ignore errors during cleanup
      }

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
      // Validate coordinates
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error(`Invalid coordinates: x=${x}, y=${y}. Must be numbers`);
      }

      // Validate position against screen bounds
      this.validatePositionAgainstScreen({ x, y });

      // Validate button using Zod schema
      MouseButtonSchema.parse(button);
      const mouseButton = button;

      // Move to position
      this.mouse
        .moveTo(x, y)
        .then(() => {
          // Click after moving
          this.mouse
            .click(mouseButton)
            .catch((err) => console.error(`Error clicking ${button} button:`, err));
        })
        .catch((err) => console.error(`Error moving mouse to position ${x},${y}:`, err));

      return {
        success: true,
        message: `Clicked ${button} button at position: x=${x}, y=${y}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
