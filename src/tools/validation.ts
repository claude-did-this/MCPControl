import { KeyCombination, KeyHoldOperation, MousePosition } from '../types/common.js';

// Constants for validation
export const MAX_TEXT_LENGTH = 1000;
export const MAX_ALLOWED_COORDINATE = 10000; // Reasonable maximum screen dimension
export const MAX_SCROLL_AMOUNT = 1000;

/**
 * List of allowed keyboard keys for validation
 */
export const VALID_KEYS = [
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
 * Validates mouse position against screen bounds
 * @param position Position to validate
 * @returns Validated position
 * @throws Error if position is invalid or out of bounds
 */
export function validateMousePosition(position: MousePosition): MousePosition {
  // Basic type validation
  if (!position || typeof position !== 'object') {
    throw new Error('Invalid mouse position: position must be an object');
  }
  
  if (typeof position.x !== 'number' || typeof position.y !== 'number') {
    throw new Error(`Invalid mouse position: x and y must be numbers, got x=${position.x}, y=${position.y}`);
  }
  
  if (isNaN(position.x) || isNaN(position.y)) {
    throw new Error(`Invalid mouse position: x and y cannot be NaN, got x=${position.x}, y=${position.y}`);
  }

  // Check if position is within reasonable bounds
  if (position.x < -MAX_ALLOWED_COORDINATE || position.x > MAX_ALLOWED_COORDINATE || 
      position.y < -MAX_ALLOWED_COORDINATE || position.y > MAX_ALLOWED_COORDINATE) {
    throw new Error(`Position (${position.x},${position.y}) is outside reasonable bounds (-${MAX_ALLOWED_COORDINATE}, -${MAX_ALLOWED_COORDINATE})-(${MAX_ALLOWED_COORDINATE}, ${MAX_ALLOWED_COORDINATE})`);
  }
  
  return position;
}

/**
 * Validates mouse button
 * @param button Button to validate
 * @returns Validated button
 * @throws Error if button is invalid
 */
export function validateMouseButton(button: unknown): 'left' | 'right' | 'middle' {
  if (!button || typeof button !== 'string') {
    throw new Error(`Invalid mouse button: ${String(button)}`);
  }
  
  if (!['left', 'right', 'middle'].includes(button)) {
    throw new Error(`Invalid mouse button: ${button}. Must be 'left', 'right', or 'middle'`);
  }
  
  return button as 'left' | 'right' | 'middle';
}

/**
 * Validates a keyboard key
 * @param key Key to validate
 * @returns Validated key
 * @throws Error if key is invalid
 */
export function validateKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('Key is required and must be a string');
  }

  // Normalize key to lowercase for validation
  const normalizedKey = key.toLowerCase();
  
  if (!VALID_KEYS.includes(normalizedKey)) {
    throw new Error(`Invalid key: "${String(key)}". Must be one of the allowed keys.`);
  }

  return key;
}

/**
 * Checks if a key combination might be dangerous
 * @param keys Array of keys in the combination
 * @returns String with reason if dangerous, null if safe
 */
export function isDangerousKeyCombination(keys: string[]): string | null {
  const normalizedKeys = keys.map(k => k.toLowerCase());
  
  // Explicitly allow common copy/paste shortcuts
  if (normalizedKeys.length === 2 && 
      normalizedKeys.includes('control') && 
      (normalizedKeys.includes('c') || normalizedKeys.includes('v') || normalizedKeys.includes('x'))) {
    return null;
  }
  
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
 * Validates a key combination
 * @param combination Key combination to validate
 * @throws Error if combination is invalid or dangerous
 */
export function validateKeyCombination(combination: KeyCombination): void {
  // Validate the key combination
  if (!combination.keys || !Array.isArray(combination.keys) || combination.keys.length === 0) {
    throw new Error('Key combination must contain at least one key');
  }

  if (combination.keys.length > 5) {
    throw new Error(`Too many keys in combination: ${combination.keys.length} (max 5)`);
  }

  // Validate each key in the combination
  for (const key of combination.keys) {
    validateKey(key);
  }

  // Check for potentially dangerous key combinations
  const dangerous = isDangerousKeyCombination(combination.keys);
  if (dangerous) {
    throw new Error(`Potentially dangerous key combination: ${combination.keys.join('+')}. ${dangerous}`);
  }
}

/**
 * Validates key hold operation parameters
 * @param operation Key hold operation to validate
 * @throws Error if operation parameters are invalid
 */
export function validateKeyHoldOperation(operation: KeyHoldOperation): void {
  // Validate key
  validateKey(operation.key);

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
}

/**
 * Validates scroll amount
 * @param amount Scroll amount to validate
 * @throws Error if amount is invalid
 */
export function validateScrollAmount(amount: number): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid scroll amount: ${amount}. Must be a number`);
  }
  
  // Limit the maximum scroll amount
  if (Math.abs(amount) > MAX_SCROLL_AMOUNT) {
    throw new Error(`Scroll amount too large: ${amount} (max ${MAX_SCROLL_AMOUNT})`);
  }
}