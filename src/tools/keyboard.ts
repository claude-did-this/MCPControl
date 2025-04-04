import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';
import { createAutomationProvider } from '../providers/factory.js';
import { 
  MAX_TEXT_LENGTH, 
  validateKey, 
  validateKeyCombination, 
  validateKeyHoldOperation 
} from './validation.js';

// Get the automation provider
const provider = createAutomationProvider();

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

export function pressKey(key: string): WindowsControlResponse {
  try {
    // Validate key using shared validation function
    validateKey(key);

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
    // Validate the key combination using shared validation function
    validateKeyCombination(combination);

    return await provider.keyboard.pressKeyCombination(combination);
  } catch (error) {
    return {
      success: false,
      message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
  try {
    // Validate key hold operation using shared validation function
    validateKeyHoldOperation(operation);

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
