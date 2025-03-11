import libnut from '@nut-tree/libnut';
import { MousePosition, ButtonMap } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

const buttonMap: ButtonMap = {
  'left': 'left',
  'right': 'right',
  'middle': 'middle'
};

export async function moveMouse(position: MousePosition): Promise<WindowsControlResponse> {
  try {
    await libnut.moveMouse(position.x, position.y);
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

export async function clickMouse(button: keyof ButtonMap = 'left'): Promise<WindowsControlResponse> {
  try {
    const buttonName = buttonMap[button];
    await libnut.mouseClick(buttonName);
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

export async function doubleClick(position?: MousePosition): Promise<WindowsControlResponse> {
  try {
    if (position) {
      await libnut.moveMouse(position.x, position.y);
    }
    await libnut.mouseClick("left", true); // Use the built-in double click parameter
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

export async function getCursorPosition(): Promise<WindowsControlResponse> {
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

export async function scrollMouse(amount: number): Promise<WindowsControlResponse> {
  try {
    await libnut.scrollMouse(0, amount); // x is 0 for vertical scrolling
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

export async function dragMouse(from: MousePosition, to: MousePosition, button: keyof ButtonMap = 'left'): Promise<WindowsControlResponse> {
  try {
    const buttonName = buttonMap[button];
    
    // Move to start position
    await libnut.moveMouse(from.x, from.y);
    
    // Press mouse button
    await libnut.mouseToggle("down", buttonName);
    
    // Move to end position
    await libnut.moveMouse(to.x, to.y);
    
    // Release mouse button
    await libnut.mouseToggle("up", buttonName);
    
    return {
      success: true,
      message: `Dragged from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) with ${button} button`
    };
  } catch (error) {
    // Ensure mouse button is released in case of error
    try {
      await libnut.mouseToggle("up", buttonMap[button]);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function setMouseSpeed(speed: number): Promise<WindowsControlResponse> {
  try {
    // Speed is in milliseconds. Lower values = faster movement
    // Clamp between 1 and 100 for safety
    const clampedSpeed = Math.max(1, Math.min(100, speed));
    await libnut.setMouseDelay(clampedSpeed);
    
    return {
      success: true,
      message: `Mouse speed set to ${clampedSpeed}ms delay`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to set mouse speed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
