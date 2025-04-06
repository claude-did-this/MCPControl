import { AutomationProvider } from '../../interfaces/provider.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../../interfaces/automation.js';
import { KeysenderKeyboardAutomation } from './keyboard.js';
import { KeysenderMouseAutomation } from './mouse.js';
import { KeysenderScreenAutomation } from './screen.js';
import { KeysenderClipboardAutomation } from './clipboard.js';

/**
 * Keysender implementation of the AutomationProvider
 *
 * NOTE: This provider requires the Windows operating system to compile native dependencies.
 * Building this module on non-Windows platforms will fail.
 * Development requires:
 * - Node.js installed via the official Windows installer (includes necessary build tools)
 * - node-gyp installed globally (npm install -g node-gyp)
 * - cmake-js installed globally (npm install -g cmake-js)
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
