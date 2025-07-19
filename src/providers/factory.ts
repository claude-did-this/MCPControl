import { AutomationProvider } from '../interfaces/provider.js';
import { NutJSProvider } from './nutjs/index.js';
import { AutoHotkeyProvider } from './autohotkey/index.js';
import { registry } from './registry.js';
import { AutomationConfig } from '../config.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../interfaces/automation.js';

// Import individual providers
import { PowerShellClipboardProvider } from './clipboard/powershell/index.js';
import { ClipboardyProvider } from './clipboard/clipboardy/index.js';

// Cache to store provider instances
const providerCache: Record<string, AutomationProvider> = {};

/**
 * Initialize the provider registry with available providers
 */
export function initializeProviders(): void {
  // Register clipboard providers
  registry.registerClipboard('powershell', new PowerShellClipboardProvider());
  registry.registerClipboard('clipboardy', new ClipboardyProvider());

  // Register AutoHotkey providers
  const autohotkeyProvider = new AutoHotkeyProvider();
  registry.registerKeyboard('autohotkey', autohotkeyProvider.keyboard);
  registry.registerMouse('autohotkey', autohotkeyProvider.mouse);
  registry.registerScreen('autohotkey', autohotkeyProvider.screen);
  registry.registerClipboard('autohotkey', autohotkeyProvider.clipboard);

  // TODO: Register other providers as they are implemented
}

/**
 * Composite provider that allows mixing different component providers
 */
class CompositeProvider implements AutomationProvider {
  keyboard: KeyboardAutomation;
  mouse: MouseAutomation;
  screen: ScreenAutomation;
  clipboard: ClipboardAutomation;

  constructor(
    keyboard: KeyboardAutomation,
    mouse: MouseAutomation,
    screen: ScreenAutomation,
    clipboard: ClipboardAutomation,
  ) {
    this.keyboard = keyboard;
    this.mouse = mouse;
    this.screen = screen;
    this.clipboard = clipboard;
  }
}

/**
 * Create an automation provider instance based on configuration
 * Supports both legacy monolithic providers and new modular providers
 */
export function createAutomationProvider(config?: AutomationConfig): AutomationProvider {
  // Initialize providers if not already done
  if (registry.getAvailableProviders().clipboards.length === 0) {
    initializeProviders();
  }

  if (!config || !config.providers) {
    // Legacy behavior: use monolithic provider
    const type = config?.provider || 'nutjs';
    const providerType = type.toLowerCase();

    // Return cached instance if available
    if (providerCache[providerType]) {
      return providerCache[providerType];
    }

    let provider: AutomationProvider;
    switch (providerType) {
      case 'nutjs':
        provider = new NutJSProvider();
        break;
      case 'autohotkey':
        provider = new AutoHotkeyProvider();
        break;
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    // Cache the instance
    providerCache[providerType] = provider;
    return provider;
  }

  // New modular approach
  const cacheKey = JSON.stringify(config.providers);
  if (providerCache[cacheKey]) {
    return providerCache[cacheKey];
  }

  // Get individual components from the registry
  const keyboardProvider = config.providers.keyboard
    ? registry.getKeyboard(config.providers.keyboard)
    : new NutJSProvider().keyboard;

  const mouseProvider = config.providers.mouse
    ? registry.getMouse(config.providers.mouse)
    : new NutJSProvider().mouse;

  const screenProvider = config.providers.screen
    ? registry.getScreen(config.providers.screen)
    : new NutJSProvider().screen;

  const clipboardProvider = config.providers.clipboard
    ? registry.getClipboard(config.providers.clipboard)
    : new NutJSProvider().clipboard;

  if (!keyboardProvider || !mouseProvider || !screenProvider || !clipboardProvider) {
    throw new Error('Failed to resolve all provider components');
  }

  const compositeProvider = new CompositeProvider(
    keyboardProvider,
    mouseProvider,
    screenProvider,
    clipboardProvider,
  );

  providerCache[cacheKey] = compositeProvider;
  return compositeProvider;
}
