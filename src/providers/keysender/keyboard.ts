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
      // Start the asynchronous operation and handle errors properly
      this.keyboard.printText(input.text)
        .catch(err => {
          console.error('Error typing text:', err);
          // We can't update the response after it's returned, but at least log the error
        });
      
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
      // Validate the key before using it
      if (!key || typeof key !== 'string') {
        throw new Error(`Invalid keyboard key: ${key}`);
      }
      
      // Map the key to KeyboardButton type with validation
      const keyboardKey = key as unknown as KeyboardButton;
      
      // Start the asynchronous operation and handle errors properly
      this.keyboard.sendKey(keyboardKey)
        .catch(err => {
          console.error(`Error pressing key ${key}:`, err);
          // We can't update the response after it's returned, but at least log the error
        });
      
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
      const pressPromises = [];

      // Use toggleKey to press and release keys
      // Press all keys down
      for (const key of combination.keys) {
        // Validate the key before using it
        if (!key || typeof key !== 'string') {
          throw new Error(`Invalid keyboard key in combination: ${key}`);
        }
        
        const keyboardKey = key as unknown as KeyboardButton;
        // Collect all promises to handle them properly
        pressPromises.push(
          this.keyboard.toggleKey(keyboardKey, true)
            .catch(err => {
              console.error(`Error pressing key ${key}:`, err);
              throw err; // Re-throw to be caught by the outer try/catch
            })
        );
      }

      // Wait for all keys to be pressed
      await Promise.all(pressPromises);
      
      // Small delay to ensure all keys are pressed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Release all keys in reverse order
      const releasePromises = [];
      for (const key of [...combination.keys].reverse()) {
        const keyboardKey = key as unknown as KeyboardButton;
        releasePromises.push(
          this.keyboard.toggleKey(keyboardKey, false)
            .catch(err => {
              console.error(`Error releasing key ${key}:`, err);
              throw err; // Re-throw to be caught by the outer try/catch
            })
        );
      }

      // Wait for all keys to be released
      await Promise.all(releasePromises);

      return {
        success: true,
        message: `Pressed key combination: ${keysForMessage.join('+')}`
      };
    } catch (error) {
      // Ensure all keys are released in case of error
      try {
        const cleanupPromises = [];
        for (const key of combination.keys) {
          const keyboardKey = key as unknown as KeyboardButton;
          cleanupPromises.push(
            this.keyboard.toggleKey(keyboardKey, false)
              .catch(err => {
                console.error(`Error releasing key ${key} during cleanup:`, err);
                // Ignore errors during cleanup
              })
          );
        }
        await Promise.all(cleanupPromises);
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
      // Validate the key before using it
      if (!operation.key || typeof operation.key !== 'string') {
        throw new Error(`Invalid keyboard key: ${operation.key}`);
      }
      
      // Toggle the key state (down/up)
      const keyboardKey = operation.key as unknown as KeyboardButton;
      await this.keyboard.toggleKey(keyboardKey, operation.state === 'down');

      // If it's a key press (down) with duration, wait for the specified duration then release
      if (operation.state === 'down' && operation.duration) {
        await new Promise(resolve => setTimeout(resolve, operation.duration));
        await this.keyboard.toggleKey(keyboardKey, false);
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
          await this.keyboard.toggleKey(keyboardKey, false);
        } catch (releaseError) {
          console.error(`Error releasing key ${operation.key} during cleanup:`, releaseError);
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
