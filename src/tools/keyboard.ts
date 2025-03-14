import libnut from '@nut-tree/libnut';
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

export function typeText(input: KeyboardInput): WindowsControlResponse {
  try {
    libnut.typeString(input.text);
    return {
      success: true,
      message: `Typed text successfully`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function pressKey(key: string): WindowsControlResponse {
  try {
    libnut.keyTap(key);
    return {
      success: true,
      message: `Pressed key: ${key}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
  try {
    // Store original keys for the message
    const keysForMessage = [...combination.keys];

    // Press down all keys in sequence
    for (const key of combination.keys) {
      libnut.keyToggle(key, 'down');
    }

    // Small delay to ensure all keys are pressed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Release all keys in reverse order
    for (const key of [...combination.keys].reverse()) {
      libnut.keyToggle(key, 'up');
    }

    return {
      success: true,
      message: `Pressed key combination: ${keysForMessage.join('+')}`
    };
  } catch (error) {
    // Ensure all keys are released in case of error
    try {
      for (const key of combination.keys) {
        libnut.keyToggle(key, 'up');
      }
    } catch {
      // Ignore errors during cleanup
    }

    return {
      success: false,
      message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
  try {
    // Toggle the key state (down/up)
    libnut.keyToggle(operation.key, operation.state);

    // If it's a key press (down), wait for the specified duration then release
    if (operation.state === 'down') {
      await new Promise(resolve => setTimeout(resolve, operation.duration));
      libnut.keyToggle(operation.key, 'up');
    }

    return {
      success: true,
      message: `Key ${operation.key} ${operation.state === 'down' ? 'held' : 'released'} successfully${
        operation.state === 'down' ? ` for ${operation.duration}ms` : ''
      }`
    };
  } catch (error) {
    // Ensure key is released in case of error during hold
    if (operation.state === 'down') {
      try {
        libnut.keyToggle(operation.key, 'up');
      } catch {
        // Ignore errors during cleanup
      }
    }

    return {
      success: false,
      message: `Failed to ${operation.state} key ${operation.key}: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }
}
