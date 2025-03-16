import { AutomationProvider } from '../../interfaces/provider.js';
import { KeyboardAutomation, MouseAutomation, ScreenAutomation, ClipboardAutomation } from '../../interfaces/automation.js';
import { NutJSKeyboardAutomation } from './keyboard.js';
// We'll implement these later in subsequent PRs
// import { NutJSMouseAutomation } from './mouse.js';
// import { NutJSScreenAutomation } from './screen.js';
// import { NutJSClipboardAutomation } from './clipboard.js';

// For now, we'll just import the existing implementations
import * as mouseOriginal from '../../tools/mouse.js';
import * as screenOriginal from '../../tools/screen.js';
import * as screenshotOriginal from '../../tools/screenshot.js';
import * as clipboardOriginal from '../../tools/clipboard.js';
import { MousePosition, ScreenshotOptions, ClipboardInput } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';

/**
 * Bridge adapter for mouse functionality until full implementation is ready
 */
class NutJSMouseAdapter implements MouseAutomation {
  moveMouse(position: MousePosition): WindowsControlResponse {
    return mouseOriginal.moveMouse(position);
  }

  clickMouse(button?: 'left' | 'right' | 'middle'): WindowsControlResponse {
    return mouseOriginal.clickMouse(button);
  }

  doubleClick(position?: MousePosition): WindowsControlResponse {
    return mouseOriginal.doubleClick(position);
  }

  getCursorPosition(): WindowsControlResponse {
    return mouseOriginal.getCursorPosition();
  }

  scrollMouse(amount: number): WindowsControlResponse {
    return mouseOriginal.scrollMouse(amount);
  }

  dragMouse(from: MousePosition, to: MousePosition, button?: 'left' | 'right' | 'middle'): WindowsControlResponse {
    return mouseOriginal.dragMouse(from, to, button);
  }

  clickAt(x: number, y: number, button?: 'left' | 'right' | 'middle'): WindowsControlResponse {
    return mouseOriginal.clickAt(x, y, button);
  }

  setMouseSpeed(speed: number): WindowsControlResponse {
    return mouseOriginal.setMouseSpeed(speed);
  }
}

/**
 * Bridge adapter for screen functionality until full implementation is ready
 */
class NutJSScreenAdapter implements ScreenAutomation {
  getScreenSize(): WindowsControlResponse {
    return screenOriginal.getScreenSize();
  }

  getActiveWindow(): WindowsControlResponse {
    return screenOriginal.getActiveWindow();
  }

  focusWindow(title: string): WindowsControlResponse {
    return screenOriginal.focusWindow(title);
  }

  resizeWindow(title: string, width: number, height: number): WindowsControlResponse {
    return screenOriginal.resizeWindow(title, width, height);
  }

  repositionWindow(title: string, x: number, y: number): WindowsControlResponse {
    return screenOriginal.repositionWindow(title, x, y);
  }

  async getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse> {
    return screenshotOriginal.getScreenshot(options);
  }
}

/**
 * Bridge adapter for clipboard functionality until full implementation is ready
 */
class NutJSClipboardAdapter implements ClipboardAutomation {
  async getClipboardContent(): Promise<WindowsControlResponse> {
    const result = await clipboardOriginal.getClipboardContent();
    return {
      success: result.success,
      message: result.content ? `Clipboard content retrieved` : `Failed to get clipboard content: ${result.error || 'Unknown error'}`,
      data: result.content // Store clipboard content in data field instead of content
    };
  }

  async setClipboardContent(input: ClipboardInput): Promise<WindowsControlResponse> {
    const result = await clipboardOriginal.setClipboardContent(input);
    return {
      ...result,
      message: result.success ? `Clipboard content set` : `Failed to set clipboard content: ${result.error || 'Unknown error'}`
    };
  }

  async hasClipboardText(): Promise<WindowsControlResponse> {
    const result = await clipboardOriginal.hasClipboardText();
    return {
      ...result,
      message: result.success ? `Clipboard ${result.hasText ? 'has' : 'does not have'} text` : `Failed to check clipboard: ${result.error || 'Unknown error'}`
    };
  }

  async clearClipboard(): Promise<WindowsControlResponse> {
    const result = await clipboardOriginal.clearClipboard();
    return {
      ...result,
      message: result.success ? `Clipboard cleared` : `Failed to clear clipboard: ${result.error || 'Unknown error'}`
    };
  }
}

/**
 * NutJS implementation of the AutomationProvider
 */
export class NutJSProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor() {
    // Fully refactored implementation
    this.keyboard = new NutJSKeyboardAutomation();
    
    // Adapter implementations until we refactor these in subsequent PRs
    this.mouse = new NutJSMouseAdapter();
    this.screen = new NutJSScreenAdapter();
    this.clipboard = new NutJSClipboardAdapter();
  }
}