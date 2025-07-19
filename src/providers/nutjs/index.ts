import { AutomationProvider } from '../../interfaces/provider.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../../interfaces/automation.js';
import { NutJSKeyboardAutomation } from './keyboard.js';
import { NutJSMouseAutomation } from './mouse.js';
import { NutJSScreenAutomation } from './screen.js';
import { NutJSClipboardAutomation } from './clipboard.js';

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
    this.clipboard = new NutJSClipboardAutomation();
  }
}
