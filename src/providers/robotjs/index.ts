import { AutomationProvider } from '../../interfaces/provider.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../../interfaces/automation.js';
import { RobotJSKeyboardAutomation } from './keyboard.js';
import { RobotJSMouseAutomation } from './mouse.js';
import { RobotJSScreenAutomation } from './screen.js';
import { RobotJSClipboardAutomation } from './clipboard.js';

/**
 * RobotJS implementation of the AutomationProvider
 */
export class RobotJSProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor() {
    // Fully refactored implementations
    this.keyboard = new RobotJSKeyboardAutomation();
    this.mouse = new RobotJSMouseAutomation();
    this.screen = new RobotJSScreenAutomation();
    this.clipboard = new RobotJSClipboardAutomation();
  }
}
