import { AutomationProvider } from '../../interfaces/provider.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../../interfaces/automation.js';
import { AutoHotkeyKeyboardAutomation } from './keyboard.js';
import { AutoHotkeyMouseAutomation } from './mouse.js';
import { AutoHotkeyScreenAutomation } from './screen.js';
import { AutoHotkeyClipboardAutomation } from './clipboard.js';

/**
 * AutoHotkey implementation of the AutomationProvider
 *
 * NOTE: This provider requires AutoHotkey v2.0+ to be installed on the system.
 * It executes AutoHotkey scripts to perform automation tasks.
 */
export class AutoHotkeyProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor() {
    this.keyboard = new AutoHotkeyKeyboardAutomation();
    this.mouse = new AutoHotkeyMouseAutomation();
    this.screen = new AutoHotkeyScreenAutomation();
    this.clipboard = new AutoHotkeyClipboardAutomation();
  }
}
