import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../interfaces/automation.js';

export interface ProviderRegistry {
  registerKeyboard(name: string, provider: KeyboardAutomation): void;
  registerMouse(name: string, provider: MouseAutomation): void;
  registerScreen(name: string, provider: ScreenAutomation): void;
  registerClipboard(name: string, provider: ClipboardAutomation): void;

  getKeyboard(name: string): KeyboardAutomation | undefined;
  getMouse(name: string): MouseAutomation | undefined;
  getScreen(name: string): ScreenAutomation | undefined;
  getClipboard(name: string): ClipboardAutomation | undefined;
}

/**
 * Central registry for automation providers
 * Allows registration and retrieval of individual automation components
 */
export class DefaultProviderRegistry implements ProviderRegistry {
  private keyboards = new Map<string, KeyboardAutomation>();
  private mice = new Map<string, MouseAutomation>();
  private screens = new Map<string, ScreenAutomation>();
  private clipboards = new Map<string, ClipboardAutomation>();

  registerKeyboard(name: string, provider: KeyboardAutomation): void {
    this.keyboards.set(name, provider);
  }

  registerMouse(name: string, provider: MouseAutomation): void {
    this.mice.set(name, provider);
  }

  registerScreen(name: string, provider: ScreenAutomation): void {
    this.screens.set(name, provider);
  }

  registerClipboard(name: string, provider: ClipboardAutomation): void {
    this.clipboards.set(name, provider);
  }

  getKeyboard(name: string): KeyboardAutomation | undefined {
    return this.keyboards.get(name);
  }

  getMouse(name: string): MouseAutomation | undefined {
    return this.mice.get(name);
  }

  getScreen(name: string): ScreenAutomation | undefined {
    return this.screens.get(name);
  }

  getClipboard(name: string): ClipboardAutomation | undefined {
    return this.clipboards.get(name);
  }

  /**
   * Get a list of all registered provider names for each component type
   */
  getAvailableProviders(): {
    keyboards: string[];
    mice: string[];
    screens: string[];
    clipboards: string[];
  } {
    return {
      keyboards: Array.from(this.keyboards.keys()),
      mice: Array.from(this.mice.keys()),
      screens: Array.from(this.screens.keys()),
      clipboards: Array.from(this.clipboards.keys()),
    };
  }
}

// Singleton instance
export const registry = new DefaultProviderRegistry();
