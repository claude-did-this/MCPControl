import { Hardware, KeyboardButton } from 'keysender';
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { KeyboardAutomation } from '../../interfaces/automation.js';

/**
 * Keysender implementation of the KeyboardAutomation interface
 */
export class KeysenderKeyboardAutomation implements KeyboardAutomation {
  private keyboard = new Hardware().keyboard;

  typeText(input: KeyboardInput): WindowsControlResponse {
    try {
      // Execute asynchronously but return synchronously
      this.keyboard.printText(input.text).catch(err => console.error('Error typing text:', err));
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

  pressKey(key: string): WindowsControlResponse {
    try {
      // Map the key to KeyboardButton type and execute asynchronously
      const keyboardKey = key as unknown as KeyboardButton;
      this.keyboard.sendKey(keyboardKey).catch(err => console.error(`Error pressing key ${key}:`, err));
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

  async pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
    try {
      // Store original keys for the message
      const keysForMessage = [...combination.keys];

      // Use toggleKey to press and release keys
      // Press all keys down
      for (const key of combination.keys) {
        // Store the promise but don't await it here
        const keyboardKey = key as unknown as KeyboardButton;
        this.keyboard.toggleKey(keyboardKey, true).catch(err => console.error(`Error pressing key ${key}:`, err));
      }

      // Small delay to ensure all keys are pressed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Release all keys in reverse order
      for (const key of [...combination.keys].reverse()) {
        const keyboardKey = key as unknown as KeyboardButton;
        this.keyboard.toggleKey(keyboardKey, false).catch(err => console.error(`Error releasing key ${key}:`, err));
      }

      return {
        success: true,
        message: `Pressed key combination: ${keysForMessage.join('+')}`
      };
    } catch (error) {
      // Ensure all keys are released in case of error
      try {
        for (const key of combination.keys) {
          const keyboardKey = key as unknown as KeyboardButton;
          this.keyboard.toggleKey(keyboardKey, false).catch(err => console.error(`Error releasing key ${key}:`, err));
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

  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    try {
      // Toggle the key state (down/up)
      const keyboardKey = operation.key as unknown as KeyboardButton;
      this.keyboard.toggleKey(keyboardKey, operation.state === 'down')
        .catch(err => console.error(`Error toggling key ${operation.key}:`, err));

      // If it's a key press (down) with duration, wait for the specified duration then release
      if (operation.state === 'down' && operation.duration) {
        await new Promise(resolve => setTimeout(resolve, operation.duration));
        const keyboardKey = operation.key as unknown as KeyboardButton;
        this.keyboard.toggleKey(keyboardKey, false)
          .catch(err => console.error(`Error releasing key ${operation.key}:`, err));
      }

      return {
        success: true,
        message: `Key ${operation.key} ${operation.state === 'down' ? 'held' : 'released'} successfully${
          operation.state === 'down' && operation.duration ? ` for ${operation.duration}ms` : ''
        }`
      };
    } catch (error) {
      // Ensure key is released in case of error during hold
      if (operation.state === 'down') {
        try {
          const keyboardKey = operation.key as unknown as KeyboardButton;
          this.keyboard.toggleKey(keyboardKey, false)
            .catch(err => console.error(`Error releasing key ${operation.key}:`, err));
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
}
