import { Hardware, KeyboardButton } from 'keysender';
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { KeyboardAutomation } from '../../interfaces/automation.js';

// Constants for validation
const MAX_TEXT_LENGTH = 1000;

// List of allowed keyboard keys for validation
const VALID_KEYS = [
  // Letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  // Numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Special keys
  'space', 'escape', 'tab', 'alt', 'control', 'shift', 'right_shift',
  'command', 'enter', 'return', 'backspace', 'delete', 'home', 'end',
  'page_up', 'page_down', 'left', 'up', 'right', 'down',
  // Function keys
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
  // Symbols
  '.', ',', '/', '\\', '[', ']', ';', '\'', '`', '-', '=', 'plus'
];

/**
 * Checks if a key combination might be dangerous
 * @param keys Array of keys in the combination
 * @returns String with reason if dangerous, null if safe
 */
function isDangerousKeyCombination(keys: string[]): string | null {
  const normalizedKeys = keys.map(k => k.toLowerCase());
  
  // Check for OS-level dangerous combinations
  if (normalizedKeys.includes('command') || normalizedKeys.includes('control')) {
    // Control+Alt+Delete or Command+Option+Esc (Force Quit on Mac)
    if ((normalizedKeys.includes('control') && normalizedKeys.includes('alt') && normalizedKeys.includes('delete')) ||
        (normalizedKeys.includes('command') && normalizedKeys.includes('alt') && normalizedKeys.includes('escape'))) {
      return 'This combination can trigger system functions';
    }
    
    // Windows key combinations
    if (normalizedKeys.includes('command') && normalizedKeys.includes('r')) {
      return 'This combination can open the Run dialog';
    }
    
    if ((normalizedKeys.includes('control') || normalizedKeys.includes('command')) && 
        (normalizedKeys.includes('alt') || normalizedKeys.includes('option')) && 
        normalizedKeys.includes('t')) {
      return 'This combination can open a terminal';
    }
  }
  
  return null;
}

/**
 * Keysender implementation of the KeyboardAutomation interface
 */
export class KeysenderKeyboardAutomation implements KeyboardAutomation {
  private keyboard = new Hardware().keyboard;

  /**
   * Validate a key and convert it to KeyboardButton
   * @param key Key to validate
   * @returns KeyboardButton
   * @throws Error if key is invalid
   */
  private validateKey(key: string): KeyboardButton {
    if (!key || typeof key !== 'string') {
      throw new Error(`Invalid keyboard key: ${key}`);
    }
    
    // Normalize key to lowercase for validation
    const normalizedKey = key.toLowerCase();
    
    if (!VALID_KEYS.includes(normalizedKey)) {
      throw new Error(`Invalid key: "${String(key)}". Must be one of the allowed keys.`);
    }
    
    return key as unknown as KeyboardButton;
  }

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
      // Validate the key and convert to KeyboardButton
      const keyboardKey = this.validateKey(key);
      
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
      // Validate the key combination
      if (!combination.keys || !Array.isArray(combination.keys) || combination.keys.length === 0) {
        throw new Error('Key combination must contain at least one key');
      }

      if (combination.keys.length > 5) {
        throw new Error(`Too many keys in combination: ${combination.keys.length} (max 5)`);
      }

      // Check for potentially dangerous key combinations
      const dangerous = isDangerousKeyCombination(combination.keys);
      if (dangerous) {
        throw new Error(`Potentially dangerous key combination: ${combination.keys.join('+')}. ${dangerous}`);
      }

      // Store original keys for the message
      const keysForMessage = [...combination.keys];
      const pressPromises = [];

      // Validate each key and collect press promises
      const validatedKeys: KeyboardButton[] = [];
      for (const key of combination.keys) {
        const keyboardKey = this.validateKey(key);
        validatedKeys.push(keyboardKey);
        
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
      for (let i = validatedKeys.length - 1; i >= 0; i--) {
        const keyboardKey = validatedKeys[i];
        const originalKey = combination.keys[i];
        
        releasePromises.push(
          this.keyboard.toggleKey(keyboardKey, false)
            .catch(err => {
              console.error(`Error releasing key ${originalKey}:`, err);
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
          try {
            const keyboardKey = this.validateKey(key);
            cleanupPromises.push(
              this.keyboard.toggleKey(keyboardKey, false)
                .catch(err => {
                  console.error(`Error releasing key ${key} during cleanup:`, err);
                  // Ignore errors during cleanup
                })
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
        message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    try {
      // Validate state
      if (operation.state !== 'down' && operation.state !== 'up') {
        throw new Error(`Invalid state: ${String(operation.state)}. Must be either 'down' or 'up'`);
      }

      // Validate duration for key down operations
      if (operation.state === 'down') {
        const MAX_HOLD_DURATION = 10000; // 10 seconds maximum hold time
        const MIN_HOLD_DURATION = 10;    // 10ms minimum hold time
        
        if (!operation.duration) {
          throw new Error('Duration is required for key down operations');
        }
        
        if (typeof operation.duration !== 'number' || isNaN(operation.duration)) {
          throw new Error(`Invalid duration: ${operation.duration}. Must be a number`);
        }
        
        if (operation.duration < MIN_HOLD_DURATION) {
          throw new Error(`Duration too short: ${operation.duration}ms (min ${MIN_HOLD_DURATION}ms)`);
        }
        
        if (operation.duration > MAX_HOLD_DURATION) {
          throw new Error(`Duration too long: ${operation.duration}ms (max ${MAX_HOLD_DURATION}ms)`);
        }
      }
      
      // Validate and map the key to KeyboardButton
      const keyboardKey = this.validateKey(operation.key);
      
      // Toggle the key state (down/up)
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
          const keyboardKey = this.validateKey(operation.key);
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
