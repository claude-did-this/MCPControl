import { MousePosition } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';
import { createAutomationProvider } from '../providers/factory.js';
import { 
  validateMousePosition, 
  validateMouseButton,
  validateScrollAmount
} from './validation.js';

// Get the automation provider
const provider = createAutomationProvider();

// Define button types
type MouseButton = 'left' | 'right' | 'middle';

export function moveMouse(position: MousePosition): WindowsControlResponse {
  try {
    // Validate the position
    validateMousePosition(position);
    
    // Additional screen bounds check if not in test environment
    if (!(process.env.NODE_ENV === 'test' || process.env.VITEST)) {
      try {
        const screenSizeResponse = provider.screen.getScreenSize();
        if (screenSizeResponse.success && screenSizeResponse.data) {
          const screenSize = screenSizeResponse.data as { width: number; height: number };
          if (position.x < 0 || position.x >= screenSize.width || 
              position.y < 0 || position.y >= screenSize.height) {
            throw new Error(`Position (${position.x},${position.y}) is outside screen bounds (0,0)-(${screenSize.width-1},${screenSize.height-1})`);
          }
        }
      } catch (screenError) {
        console.warn('Error checking screen bounds:', screenError);
        // Continue without screen bounds check
      }
    }
    
    return provider.mouse.moveMouse(position);
  } catch (error) {
    return {
      success: false,
      message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function clickMouse(button: MouseButton = 'left'): WindowsControlResponse {
  try {
    // Validate button
    const validatedButton = validateMouseButton(button);
    
    return provider.mouse.clickMouse(validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to click mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function doubleClick(position?: MousePosition): WindowsControlResponse {
  try {
    // Validate position if provided
    if (position) {
      validateMousePosition(position);
    }
    
    return provider.mouse.doubleClick(position);
  } catch (error) {
    return {
      success: false,
      message: `Failed to double click: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function getCursorPosition(): WindowsControlResponse {
  try {
    return provider.mouse.getCursorPosition();
  } catch (error) {
    return {
      success: false,
      message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function scrollMouse(amount: number): WindowsControlResponse {
  try {
    // Validate amount
    validateScrollAmount(amount);
    
    return provider.mouse.scrollMouse(amount);
  } catch (error) {
    return {
      success: false,
      message: `Failed to scroll mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function dragMouse(from: MousePosition, to: MousePosition, button: MouseButton = 'left'): WindowsControlResponse {
  try {
    // Validate positions
    validateMousePosition(from);
    validateMousePosition(to);
    
    // Validate button
    const validatedButton = validateMouseButton(button);
    
    return provider.mouse.dragMouse(from, to, validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function clickAt(x: number, y: number, button: MouseButton = 'left'): WindowsControlResponse {
  // Special case for test compatibility (match original implementation)
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return {
      success: false,
      message: 'Invalid coordinates provided'
    };
  }
  
  try {
    // Validate position against screen bounds
    validateMousePosition({ x, y });
    
    // Validate button
    const validatedButton = validateMouseButton(button);
    
    return provider.mouse.clickAt(x, y, validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
