import { AutomationProvider } from '../../interfaces/provider.js';
import { KeyboardAutomation, MouseAutomation, ScreenAutomation, ClipboardAutomation } from '../../interfaces/automation.js';
import { KeysenderKeyboardAutomation } from './keyboard.js';
import { KeysenderMouseAutomation } from './mouse.js';
import { KeysenderScreenAutomation } from './screen.js';
import { KeysenderClipboardAutomation } from './clipboard.js';

/**
 * Keysender implementation of the AutomationProvider
 */
export class KeysenderProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor() {
    this.keyboard = new KeysenderKeyboardAutomation();
    this.mouse = new KeysenderMouseAutomation();
    this.screen = new KeysenderScreenAutomation();
    this.clipboard = new KeysenderClipboardAutomation();
  }
}
