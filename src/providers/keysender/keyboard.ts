import pkg from 'keysender';
const { Hardware } = pkg;

// Define keyboard button type directly
type KeyboardButtonType = string;
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { KeyboardAutomation } from '../../interfaces/automation.js';
import {
  MAX_TEXT_LENGTH,
  KeySchema,
  VALID_KEYS,
  KeyCombinationSchema,
  KeyHoldOperationSchema,
} from '../../tools/validation.zod.js';

/**
 * Keysender implementation of the KeyboardAutomation interface
 */
export class KeysenderKeyboardAutomation implements KeyboardAutomation {
  private keyboard = new Hardware().keyboard;

  typeText(input: KeyboardInput): WindowsControlResponse {
    try {
      // Validate text
      if (!input.text) {
        throw new Error('Text is required');
      }

      if (input.text.length > MAX_TEXT_LENGTH) {
        throw new Error(`Text too long: ${input.text.length} characters (max ${MAX_TEXT_LENGTH})`);
      }

      // Start the asynchronous operation and handle errors properly
      this.keyboard.printText(input.text).catch((err) => {
        console.error('Error typing text:', err);
        // We can't update the response after it's returned, but at least log the error
      });

      return {
        success: true,
        message: `Typed text successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  pressKey(key: string): WindowsControlResponse {
    try {
      // Validate the key using Zod schema
      KeySchema.parse(key);
      const keyboardKey = this._findMatchingString(key, VALID_KEYS);

      // Start the asynchronous operation and handle errors properly
      this.keyboard.sendKey(keyboardKey).catch((err) => {
        console.error(`Error pressing key ${key}:`, err);
        // We can't update the response after it's returned, but at least log the error
      });

      return {
        success: true,
        message: `Pressed key: ${key}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  _findMatchingString(A: KeyboardButtonType, ButtonList: KeyboardButtonType[]): KeyboardButtonType {
    const lowerA = A.toLowerCase();
    return ButtonList.filter((item) => lowerA == item.toLowerCase())[0];
  }

  async pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
    try {
      // Validate the key combination using Zod schema
      KeyCombinationSchema.parse(combination);

      // Store original keys for the message
      const keysForMessage = [...combination.keys];

      // Validate each key and collect press
      const validatedKeys: KeyboardButtonType[] = [];
      for (const key of combination.keys) {
        KeySchema.parse(key);
        const keyboardKey = this._findMatchingString(key, VALID_KEYS);
        validatedKeys.push(keyboardKey);
      }
      await this.keyboard.toggleKey(validatedKeys, true, 50).catch((err) => {
        console.error(`Error pressing keys:`, err);
        throw err; // Re-throw to be caught by the outer try/catch
      });
      await this.keyboard.toggleKey(validatedKeys, false, 50).catch((err) => {
        console.error(`Error releasing keys:`, err);
        throw err; // Re-throw to be caught by the outer try/catch
      });
      return {
        success: true,
        message: `Pressed key combination: ${keysForMessage.join('+')}`,
      };
    } catch (error) {
      // Ensure all keys are released in case of error
      try {
        const cleanupPromises: Promise<void>[] = [];
        for (const key of combination.keys) {
          try {
            KeySchema.parse(key);
            const keyboardKey = this._findMatchingString(key, VALID_KEYS);
            cleanupPromises.push(
              this.keyboard.toggleKey(keyboardKey, false).catch((err) => {
                console.error(`Error releasing key ${key} during cleanup:`, err);
                // Ignore errors during cleanup
              }),
            );
          } catch (validationError) {
            console.error(`Error validating key ${key} during cleanup:`, validationError);
            // Continue with other keys
          }
        }
        await Promise.all(cleanupPromises);
      } catch {
        // Ignore errors during cleanup
      }

      return {
        success: false,
        message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    try {
      // Validate key hold operation using Zod schema
      KeyHoldOperationSchema.parse(operation);

      // Toggle the key state (down/up)
      await this.keyboard.toggleKey(operation.key, operation.state === 'down');

      // If it's a key press (down) with duration, wait for the specified duration then release
      if (operation.state === 'down' && operation.duration) {
        await new Promise((resolve) => setTimeout(resolve, operation.duration));
        await this.keyboard.toggleKey(operation.key, false);
      }

      return {
        success: true,
        message: `Key ${operation.key} ${operation.state === 'down' ? 'held' : 'released'} successfully${
          operation.state === 'down' && operation.duration ? ` for ${operation.duration}ms` : ''
        }`,
      };
    } catch (error) {
      // Ensure key is released in case of error during hold
      if (operation.state === 'down') {
        try {
          await this.keyboard.toggleKey(operation.key, false);
        } catch (releaseError) {
          console.error(`Error releasing key ${operation.key} during cleanup:`, releaseError);
          // Ignore errors during cleanup
        }
      }

      return {
        success: false,
        message: `Failed to ${operation.state} key ${operation.key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
