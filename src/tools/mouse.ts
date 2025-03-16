import libnut from '@nut-tree/libnut';
import { MousePosition, ButtonMap } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

const buttonMap: ButtonMap = {
  'left': 'left',
  'right': 'right',
  'middle': 'middle'
};

export function moveMouse(position: MousePosition): WindowsControlResponse {
  try {
    libnut.moveMouse(position.x, position.y);
    return {
      success: true,
      message: `Mouse moved to position (${position.x}, ${position.y})`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function clickMouse(button: keyof ButtonMap = 'left'): WindowsControlResponse {
  try {
    const buttonName = buttonMap[button];
    libnut.mouseClick(buttonName);
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

export function doubleClick(position?: MousePosition): WindowsControlResponse {
  try {
    if (position) {
      libnut.moveMouse(position.x, position.y);
    }
    libnut.mouseClick("left", true); // Use the built-in double click parameter
    return {
      success: true,
      message: position ? 
        `Double clicked at position (${position.x}, ${position.y})` : 
        "Double clicked at current position"
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to double click: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function getCursorPosition(): WindowsControlResponse {
  try {
    const position = libnut.getMousePos();
    return {
      success: true,
      message: "Cursor position retrieved successfully",
      data: {
        x: position.x,
        y: position.y
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function scrollMouse(amount: number): WindowsControlResponse {
  try {
    libnut.scrollMouse(0, amount); // x is 0 for vertical scrolling
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

export function dragMouse(from: MousePosition, to: MousePosition, button: keyof ButtonMap = 'left'): WindowsControlResponse {
  try {
    const buttonName = buttonMap[button];
    
    // Move to start position
    libnut.moveMouse(from.x, from.y);
    
    // Press mouse button
    libnut.mouseToggle("down", buttonName);
    
    // Move to end position
    libnut.moveMouse(to.x, to.y);
    
    // Release mouse button
    libnut.mouseToggle("up", buttonName);
    
    return {
      success: true,
      message: `Dragged from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) with ${button} button`
    };
  } catch (error) {
    // Ensure mouse button is released in case of error
    try {
      libnut.mouseToggle("up", buttonMap[button]);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function clickAt(x: number, y: number, button: keyof ButtonMap = 'left'): WindowsControlResponse {
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return {
      success: false,
      message: 'Invalid coordinates provided'
    };
  }
  try {
    // Store original position
    const originalPosition = libnut.getMousePos();
    
    // Move to target position
    libnut.moveMouse(x, y);
    
    // Perform click
    libnut.mouseClick(buttonMap[button]);
    
    // Return to original position
    libnut.moveMouse(originalPosition.x, originalPosition.y);
    
    return {
      success: true,
      message: `Clicked ${button} button at position (${x}, ${y}) and returned to (${originalPosition.x}, ${originalPosition.y})`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

