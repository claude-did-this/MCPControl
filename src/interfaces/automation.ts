import {
  MousePosition,
  KeyboardInput,
  KeyboardStreamOptions,
  KeyCombination,
  KeyHoldOperation,
  ScreenshotOptions,
  ClipboardInput,
} from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

export interface KeyboardAutomation {
  /**
   * Types text using the keyboard
   * @param input The text to type
   * @returns Response indicating success or failure
   */
  typeText(input: KeyboardInput): WindowsControlResponse;

  /**
   * Types text with human-like timing, streaming progress character by character
   * @param input The text to type along with optional streaming configuration
   * @returns AsyncGenerator yielding typing progress updates
   */
  typeTextStream(
    input: KeyboardInput & KeyboardStreamOptions,
  ): AsyncGenerator<WindowsControlResponse>;

  /**
   * Presses a single key
   * @param key The key to press
   * @returns Response indicating success or failure
   */
  pressKey(key: string): WindowsControlResponse;

  /**
   * Presses multiple keys simultaneously (keyboard shortcut)
   * @param combination Keys to press together
   * @returns Response indicating success or failure
   */
  pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse>;

  /**
   * Holds down or releases a key
   * @param operation Key hold operation details
   * @returns Response indicating success or failure
   */
  holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse>;
}

export interface MouseAutomation {
  moveMouse(position: MousePosition): WindowsControlResponse;
  clickMouse(button?: 'left' | 'right' | 'middle'): WindowsControlResponse;
  doubleClick(position?: MousePosition): WindowsControlResponse;
  getCursorPosition(): WindowsControlResponse;
  scrollMouse(amount: number): WindowsControlResponse;
  dragMouse(
    from: MousePosition,
    to: MousePosition,
    button?: 'left' | 'right' | 'middle',
  ): WindowsControlResponse;
  clickAt(x: number, y: number, button?: 'left' | 'right' | 'middle'): WindowsControlResponse;
}

export interface ScreenAutomation {
  getScreenSize(): WindowsControlResponse;
  getActiveWindow(): WindowsControlResponse;
  focusWindow(title: string): WindowsControlResponse;
  resizeWindow(title: string, width: number, height: number): Promise<WindowsControlResponse>;
  repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse>;
  getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse>;
}

export interface ClipboardAutomation {
  getClipboardContent(): Promise<WindowsControlResponse>;
  setClipboardContent(input: ClipboardInput): Promise<WindowsControlResponse>;
  hasClipboardText(): Promise<WindowsControlResponse>;
  clearClipboard(): Promise<WindowsControlResponse>;
}
