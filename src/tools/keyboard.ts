import libnut from '@nut-tree/libnut';
import { KeyboardInput, KeyCombination } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

export async function typeText(input: KeyboardInput): Promise<WindowsControlResponse> {
  try {
    await libnut.typeString(input.text);
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

export async function pressKey(key: string): Promise<WindowsControlResponse> {
  try {
    await libnut.keyTap(key);
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
    // Press down all keys in sequence
    for (const key of combination.keys) {
      await libnut.keyToggle(key, 'down');
    }

    // Small delay to ensure all keys are pressed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Release all keys in reverse order
    for (const key of combination.keys.reverse()) {
      await libnut.keyToggle(key, 'up');
    }

    return {
      success: true,
      message: `Pressed key combination: ${combination.keys.join('+')}`
    };
  } catch (error) {
    // Ensure all keys are released in case of error
    try {
      for (const key of combination.keys) {
        await libnut.keyToggle(key, 'up');
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
