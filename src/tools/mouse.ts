import libnut from '@nut-tree/libnut';
import { MousePosition, ButtonMap } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

const buttonMap: ButtonMap = {
  'left': 0,
  'right': 1,
  'middle': 2
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
    const buttonCode = buttonMap[button];
    await libnut.mouseClick(String(buttonCode));
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
    await libnut.mouseClick("0"); // First click
    await libnut.mouseClick("0"); // Second click
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
