import { Hardware, MouseButton } from 'keysender';
import { MousePosition } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { MouseAutomation } from '../../interfaces/automation.js';

/**
 * Keysender implementation of the MouseAutomation interface
 */
export class KeysenderMouseAutomation implements MouseAutomation {
  private mouse = new Hardware().mouse;
  
  // Button mapping for keysender
  private mapButton(button: 'left' | 'right' | 'middle'): MouseButton {
    return button as unknown as MouseButton;
  }

  moveMouse(position: MousePosition): WindowsControlResponse {
    try {
      this.mouse.moveTo(position.x, position.y).catch(err => 
        console.error(`Error moving mouse to position ${position.x},${position.y}:`, err));
      return {
        success: true,
        message: `Moved mouse to position: x=${position.x}, y=${position.y}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  clickMouse(button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    try {
      this.mouse.click(this.mapButton(button)).catch(err => 
        console.error(`Error clicking ${button} button:`, err));
      return {
        success: true,
        message: `Clicked ${button} mouse button`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  doubleClick(position?: MousePosition): WindowsControlResponse {
    try {
      // Move to position first if provided
      if (position) {
        this.mouse.moveTo(position.x, position.y).catch(err => 
          console.error(`Error moving mouse to position ${position.x},${position.y}:`, err));
      }
      
      // Double click by clicking twice
      this.mouse.click().catch(err => console.error('Error on first click of double-click:', err));
      setTimeout(() => {
        this.mouse.click().catch(err => console.error('Error on second click of double-click:', err));
      }, 50);
      
      return {
        success: true,
        message: position 
          ? `Double-clicked at position: x=${position.x}, y=${position.y}` 
          : 'Double-clicked at current position'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double-click: ${error instanceof Error ? error.message : String(error)}`
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
        data: position
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  scrollMouse(amount: number): WindowsControlResponse {
    try {
      this.mouse.scrollWheel(amount).catch(err => 
        console.error(`Error scrolling mouse by ${amount}:`, err));
      return {
        success: true,
        message: `Scrolled mouse ${amount > 0 ? 'down' : 'up'} by ${Math.abs(amount)} units`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to scroll mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  dragMouse(from: MousePosition, to: MousePosition, button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    try {
      // Move to start position
      this.mouse.moveTo(from.x, from.y).catch(err => 
        console.error(`Error moving mouse to start position ${from.x},${from.y}:`, err));
      
      // Press mouse button down
      this.mouse.toggle(this.mapButton(button), true).catch(err => 
        console.error(`Error pressing ${button} button down:`, err));
      
      // Small delay to ensure button is pressed (non-blocking)
      setTimeout(() => {
        // Move to end position after delay
        this.mouse.moveTo(to.x, to.y).catch(err => 
          console.error(`Error moving mouse to end position ${to.x},${to.y}:`, err));
        
        // Release mouse button
        this.mouse.toggle(this.mapButton(button), false).catch(err => 
          console.error(`Error releasing ${button} button:`, err));
      }, 50);
      
      
      return {
        success: true,
        message: `Dragged mouse from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) using ${button} button`
      };
    } catch (error) {
      // Ensure mouse button is released in case of error
      try {
        this.mouse.toggle(this.mapButton(button), false).catch(err => 
          console.error(`Error releasing ${button} button during cleanup:`, err));
      } catch {
        // Ignore errors during cleanup
      }
      
      return {
        success: false,
        message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  clickAt(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    try {
      // Move to position
      this.mouse.moveTo(x, y).catch(err => 
        console.error(`Error moving mouse to position ${x},${y}:`, err));
      
      // Click
      this.mouse.click(this.mapButton(button)).catch(err => 
        console.error(`Error clicking ${button} button:`, err));
      
      return {
        success: true,
        message: `Clicked ${button} button at position: x=${x}, y=${y}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
