import { MousePosition } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';
import { createAutomationProvider } from '../providers/factory.js';
import { MousePositionSchema, MouseButtonSchema, ScrollAmountSchema } from './validation.zod.js';
import { transformToNativeCoordinates } from './coordinate-transformer.js';

// Get the automation provider
const provider = createAutomationProvider();

// Define button types
type MouseButton = 'left' | 'right' | 'middle';

/**
 * Moves the mouse to the specified position.
 * Automatically transforms coordinates from screenshot space to native screen space.
 *
 * @param position Position in screenshot coordinates (1280px width scale)
 * @param useNativeCoordinates If true, skips coordinate transformation (assumes position is already in native coordinates)
 * @returns WindowsControlResponse
 */
export async function moveMouse(
  position: MousePosition,
  useNativeCoordinates = false,
): Promise<WindowsControlResponse> {
  try {
    // Validate the position
    MousePositionSchema.parse(position);

    // Transform coordinates if needed
    let targetPosition = position;
    if (!useNativeCoordinates) {
      try {
        targetPosition = await transformToNativeCoordinates(position);
      } catch (transformError) {
        console.warn('Error transforming coordinates:', transformError);
        // Continue with original coordinates if transformation fails
      }
    }

    // Additional screen bounds check if not in test environment
    if (!(process.env.NODE_ENV === 'test' || process.env.VITEST)) {
      try {
        const screenSizeResponse = provider.screen.getScreenSize();
        if (screenSizeResponse.success && screenSizeResponse.data) {
          const screenSize = screenSizeResponse.data as { width: number; height: number };
          if (
            targetPosition.x < 0 ||
            targetPosition.x >= screenSize.width ||
            targetPosition.y < 0 ||
            targetPosition.y >= screenSize.height
          ) {
            throw new Error(
              `Position (${targetPosition.x},${targetPosition.y}) is outside screen bounds (0,0)-(${screenSize.width - 1},${screenSize.height - 1})`,
            );
          }
        }
      } catch (screenError) {
        console.warn('Error checking screen bounds:', screenError);
        // Continue without screen bounds check
      }
    }

    return provider.mouse.moveMouse(targetPosition);
  } catch (error) {
    return {
      success: false,
      message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function clickMouse(button: MouseButton = 'left'): WindowsControlResponse {
  try {
    // Validate button
    MouseButtonSchema.parse(button);
    const validatedButton = button;

    return provider.mouse.clickMouse(validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to click mouse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function doubleClick(
  position?: MousePosition,
  useNativeCoordinates = false,
): Promise<WindowsControlResponse> {
  try {
    // If no position provided, just double click at current position
    if (!position) {
      return provider.mouse.doubleClick();
    }

    // Validate position if provided
    MousePositionSchema.parse(position);

    // Transform coordinates if needed
    let targetPosition = position;
    if (!useNativeCoordinates && position) {
      try {
        targetPosition = await transformToNativeCoordinates(position);
      } catch (transformError) {
        console.warn('Error transforming coordinates:', transformError);
        // Continue with original coordinates if transformation fails
      }
    }

    return provider.mouse.doubleClick(targetPosition);
  } catch (error) {
    return {
      success: false,
      message: `Failed to double click: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getCursorPosition(
  returnScreenshotCoordinates = true,
): Promise<WindowsControlResponse> {
  try {
    const response = provider.mouse.getCursorPosition();

    // If we need to transform to screenshot coordinates and the response is successful
    if (returnScreenshotCoordinates && response.success && response.data) {
      try {
        const { transformToScreenshotCoordinates } = await import('./coordinate-transformer.js');
        const nativePosition = response.data as MousePosition;
        const screenshotPosition = await transformToScreenshotCoordinates(nativePosition);

        // Create a new response with transformed coordinates
        return {
          success: true,
          message: `Current cursor position in screenshot coordinates: x=${screenshotPosition.x}, y=${screenshotPosition.y}`,
          data: screenshotPosition,
          nativeCoordinates: nativePosition, // Include the original native coordinates for reference
        };
      } catch (transformError) {
        console.warn(
          'Error transforming cursor position to screenshot coordinates:',
          transformError,
        );
        // Return original response if transformation fails
      }
    }

    return response;
  } catch (error) {
    return {
      success: false,
      message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function scrollMouse(amount: number): WindowsControlResponse {
  try {
    // Validate amount
    ScrollAmountSchema.parse(amount);

    return provider.mouse.scrollMouse(amount);
  } catch (error) {
    return {
      success: false,
      message: `Failed to scroll mouse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function dragMouse(
  from: MousePosition,
  to: MousePosition,
  button: MouseButton = 'left',
  useNativeCoordinates = false,
): Promise<WindowsControlResponse> {
  try {
    // Validate positions
    MousePositionSchema.parse(from);
    MousePositionSchema.parse(to);

    // Validate button
    MouseButtonSchema.parse(button);
    const validatedButton = button;

    // Transform coordinates if needed
    let targetFrom = from;
    let targetTo = to;

    if (!useNativeCoordinates) {
      try {
        targetFrom = await transformToNativeCoordinates(from);
        targetTo = await transformToNativeCoordinates(to);
      } catch (transformError) {
        console.warn('Error transforming coordinates:', transformError);
        // Continue with original coordinates if transformation fails
      }
    }

    return provider.mouse.dragMouse(targetFrom, targetTo, validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to drag mouse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function clickAt(
  x: number,
  y: number,
  button: MouseButton = 'left',
  useNativeCoordinates = false,
): Promise<WindowsControlResponse> {
  // Special case for test compatibility (match original implementation)
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return {
      success: false,
      message: 'Invalid coordinates provided',
    };
  }

  try {
    // Validate position
    const position = { x, y };
    MousePositionSchema.parse(position);

    // Validate button
    MouseButtonSchema.parse(button);
    const validatedButton = button;

    // Transform coordinates if needed
    let targetX = x;
    let targetY = y;

    if (!useNativeCoordinates) {
      try {
        const transformedPosition = await transformToNativeCoordinates(position);
        targetX = transformedPosition.x;
        targetY = transformedPosition.y;
      } catch (transformError) {
        console.warn('Error transforming coordinates:', transformError);
        // Continue with original coordinates if transformation fails
      }
    }

    return provider.mouse.clickAt(targetX, targetY, validatedButton);
  } catch (error) {
    return {
      success: false,
      message: `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
