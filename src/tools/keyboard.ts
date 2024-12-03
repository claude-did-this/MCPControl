import libnut from '@nut-tree/libnut';
import { KeyboardInput } from '../types/common.js';
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
