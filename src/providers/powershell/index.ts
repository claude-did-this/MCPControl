import { AutomationProvider } from '../../interfaces/provider.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../../interfaces/automation.js';
import { PowerShellKeyboardAutomation } from './keyboard.js';
import { PowerShellMouseAutomation } from './mouse.js';
import { PowerShellScreenAutomation } from './screen.js';
import { PowerShellClipboardAutomation } from './clipboard.js';

/**
 * PowerShell implementation of the AutomationProvider
 * 
 * Uses PowerShell scripts to control Windows through native commands
 * Requires PowerShell 5.1 or later on Windows
 */
export class PowerShellProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor() {
    this.keyboard = new PowerShellKeyboardAutomation();
    this.mouse = new PowerShellMouseAutomation();
    this.screen = new PowerShellScreenAutomation();
    this.clipboard = new PowerShellClipboardAutomation();
  }
}