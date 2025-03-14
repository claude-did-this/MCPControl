import libnut from '@nut-tree/libnut';
import { WindowInfo } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

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

export async function listAllWindows(): Promise<WindowsControlResponse> {
  try {
    const handles = libnut.getWindows();
    
    const windowsWithNull = await Promise.all(
      handles.map((handle) => {
        try {
          const title = libnut.getWindowTitle(handle);
          const rect = libnut.getWindowRect(handle);
          
          return {
            title: title,
            position: { x: rect.x, y: rect.y },
            size: { width: rect.width, height: rect.height }
          } as WindowInfo;
        } catch {
          return null;
        }
      })
    );

    const windows = windowsWithNull.filter((window: WindowInfo | null): window is WindowInfo => window !== null);

    return {
      success: true,
      message: "Window list retrieved successfully",
      data: windows
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list windows: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function focusWindow(title: string): WindowsControlResponse {
  try {
    const handles = libnut.getWindows();
    
    for (const handle of handles) {
      try {
        const windowTitle = libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          libnut.focusWindow(handle);
          return {
            success: true,
            message: `Successfully focused window: ${title}`
          };
        }
      } catch {
        continue;
      }
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
    const handles = libnut.getWindows();
    
    for (const handle of handles) {
      try {
        const windowTitle = libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          libnut.resizeWindow(handle, { width, height });
          return {
            success: true,
            message: `Successfully resized window: ${title} to ${width}x${height}`
          };
        }
      } catch {
        continue;
      }
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
    const handles = libnut.getWindows();
    
    for (const handle of handles) {
      try {
        const windowTitle = libnut.getWindowTitle(handle);
        if (windowTitle.includes(title)) {
          libnut.moveWindow(handle, { x, y });
          return {
            success: true,
            message: `Successfully repositioned window: ${title} to (${x},${y})`
          };
        }
      } catch {
        continue;
      }
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
