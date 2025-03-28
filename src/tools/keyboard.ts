import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';
import { createAutomationProvider } from '../providers/factory.js';

// Get the automation provider
const provider = createAutomationProvider();

// Constants for validation
const MAX_TEXT_LENGTH = 1000;

export function typeText(input: KeyboardInput): WindowsControlResponse {
  try {
    // Validate text length
    if (!input.text) {
      throw new Error('Text is required');
    }
    
    if (input.text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Text too long: ${input.text.length} characters (max ${MAX_TEXT_LENGTH})`);
    }

    return provider.keyboard.typeText(input);
  } catch (error) {
    return {
      success: false,
      message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

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

export function pressKey(key: string): WindowsControlResponse {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Key is required and must be a string');
    }

    // Normalize key to lowercase for validation
    const normalizedKey = key.toLowerCase();
    
    if (!VALID_KEYS.includes(normalizedKey)) {
      throw new Error(`Invalid key: "${String(key)}". Must be one of the allowed keys.`);
    }

    return provider.keyboard.pressKey(key);
  } catch (error) {
    return {
      success: false,
      message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
  try {
    // Validate the key combination
    if (!combination.keys || !Array.isArray(combination.keys) || combination.keys.length === 0) {
      throw new Error('Key combination must contain at least one key');
    }

    if (combination.keys.length > 5) {
      throw new Error(`Too many keys in combination: ${combination.keys.length} (max 5)`);
    }

    // Validate each key in the combination
    for (const key of combination.keys) {
      if (!key || typeof key !== 'string') {
        throw new Error('All keys must be non-empty strings');
      }
      
      // Validate against allowed keys
      const normalizedKey = key.toLowerCase();
      if (!VALID_KEYS.includes(normalizedKey)) {
        throw new Error(`Invalid key in combination: "${key}". Must be one of the allowed keys.`);
      }
    }

    // Store original keys for the message
    const keysForMessage = [...combination.keys];

    // Check for potentially dangerous key combinations
    const dangerous = isDangerousKeyCombination(combination.keys);
    if (dangerous) {
      throw new Error(`Potentially dangerous key combination: ${keysForMessage.join('+')}. ${dangerous}`);
    }

    return await provider.keyboard.pressKeyCombination(combination);
  } catch (error) {

    return {
      success: false,
      message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

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

export async function holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
  try {
    // Validate key
    if (!operation.key || typeof operation.key !== 'string') {
      throw new Error('Key is required and must be a string');
    }

    // Normalize key to lowercase for validation
    const normalizedKey = operation.key.toLowerCase();
    
    if (!VALID_KEYS.includes(normalizedKey)) {
      throw new Error(`Invalid key: "${operation.key}". Must be one of the allowed keys.`);
    }

    // Validate state
    if (operation.state !== 'down' && operation.state !== 'up') {
      throw new Error(`Invalid state: ${String(operation.state)}. Must be either 'down' or 'up'`);
    }

    // Validate duration
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

    return await provider.keyboard.holdKey(operation);
  } catch (error) {

    return {
      success: false,
      message: `Failed to ${operation.state} key ${operation.key}: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }
}
