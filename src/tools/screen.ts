// This is legacy code that will be removed once the new implementation is complete

import libnut from '@nut-tree/libnut';
import { WindowInfo } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

/**
 * Helper function to find a window handle by title
 */
function findWindowHandle(title: string): number | null {
  const handles = libnut.getWindows();
  
  for (const handle of handles) {
    try {
      const windowTitle = libnut.getWindowTitle(handle);
      if (windowTitle.includes(title)) {
        return handle;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function getScreenSize(): WindowsControlResponse {
  try {
    const screen = libnut.screen.capture();
    
    return {
      success: true,
      message: "Screen size retrieved successfully",
      data: {
        width: screen.width,
        height: screen.height
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get screen size: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function getActiveWindow(): WindowsControlResponse {
  try {
    const handle = libnut.getActiveWindow();
    const title = libnut.getWindowTitle(handle);
    const rect = libnut.getWindowRect(handle);
    
    const windowInfo: WindowInfo = {
      title: title,
      position: { x: rect.x, y: rect.y },
      size: { width: rect.width, height: rect.height }
    };

    return {
      success: true,
      message: "Active window information retrieved successfully",
      data: windowInfo
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get active window information: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}


export function focusWindow(title: string): WindowsControlResponse {
  try {
    const handle = findWindowHandle(title);
    
    if (handle) {
      libnut.focusWindow(handle);
      return {
        success: true,
        message: `Successfully focused window: ${title}`
      };
    }

    return {
      success: false,
      message: `Could not find window with title: ${title}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to focus window: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function resizeWindow(title: string, width: number, height: number): WindowsControlResponse {
  try {
    const handle = findWindowHandle(title);
    
    if (handle) {
      libnut.resizeWindow(handle, { width, height });
      return {
        success: true,
        message: `Successfully resized window: ${title} to ${width}x${height}`
      };
    }

    return {
      success: false,
      message: `Could not find window with title: ${title}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to resize window: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function repositionWindow(title: string, x: number, y: number): WindowsControlResponse {
  try {
    const handle = findWindowHandle(title);
    
    if (handle) {
      libnut.moveWindow(handle, { x, y });
      return {
        success: true,
        message: `Successfully repositioned window: ${title} to (${x},${y})`
      };
    }

    return {
      success: false,
      message: `Could not find window with title: ${title}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to reposition window: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
