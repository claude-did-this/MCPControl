import { AutomationProvider } from '../../interfaces/provider.js';
import { KeyboardAutomation, MouseAutomation, ScreenAutomation, ClipboardAutomation } from '../../interfaces/automation.js';
import { NutJSKeyboardAutomation } from './keyboard.js';
import { NutJSMouseAutomation } from './mouse.js';
import { NutJSScreenAutomation } from './screen.js';
// We'll implement this later in subsequent PRs
// import { NutJSClipboardAutomation } from './clipboard.js';

// Clipboard implementation next to be refactored.
import * as clipboardOriginal from '../../tools/clipboard.js';
import { ClipboardInput } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';

/**
 * Bridge adapter for clipboard functionality until full implementation is ready
 */
class NutJSClipboardAdapter implements ClipboardAutomation {
  async getClipboardContent(): Promise<WindowsControlResponse> {
    const result = await clipboardOriginal.getClipboardContent();
    return {
      success: result.success,
      message: result.success ? `Clipboard content retrieved` : `Failed to get clipboard content: ${result.error || 'Unknown error'}`,
      data: result.content // Store clipboard content in data field instead of content
      // Error information is already included in the message
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
    // Fully refactored implementations
    this.keyboard = new NutJSKeyboardAutomation();
    this.mouse = new NutJSMouseAutomation();
    this.screen = new NutJSScreenAutomation();
    
    // Adapter implementation until we refactor in a subsequent PR
    this.clipboard = new NutJSClipboardAdapter();
  }
}
