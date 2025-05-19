import { AutomationProvider } from '../interfaces/provider.js';
import { registry } from './registry.js';
import { AutomationConfig, isWindows } from '../config.js';
import {
  KeyboardAutomation,
  MouseAutomation,
  ScreenAutomation,
  ClipboardAutomation,
} from '../interfaces/automation.js';

// Import individual providers
import { PowerShellClipboardProvider } from './clipboard/powershell/index.js';
import { ClipboardyProvider } from './clipboard/clipboardy/index.js';

// Conditionally import Windows-only providers to avoid build issues on other platforms
let KeysenderProvider: new () => AutomationProvider;
let AutoHotkeyProvider: new () => AutomationProvider;

// Cache to store provider instances
const providerCache: Record<string, AutomationProvider> = {};

/**
 * Initialize the provider registry with available providers
 */
// Synchronous version for backward compatibility
export function initializeProvidersSync(): void {
  // Register clipboard providers (cross-platform)
  registry.registerClipboard('clipboardy', new ClipboardyProvider());
  
  // Register Windows-specific providers only when running on Windows
  if (isWindows()) {
    try {
      // Dynamically import Windows-specific providers
      // PowerShell is Windows-only
      registry.registerClipboard('powershell', new PowerShellClipboardProvider());
    } catch (error) {
      console.error('Failed to load Windows-specific providers:', error);
    }
  }
}

// Async version for future use (not currently used in codebase)
export async function initializeProvidersAsync(): Promise<void> {
  // Register clipboard providers (cross-platform)
  registry.registerClipboard('clipboardy', new ClipboardyProvider());
  
  // Register Windows-specific providers only when running on Windows
  if (isWindows()) {
    try {
      // Dynamically import Windows-specific providers
      // PowerShell is Windows-only
      registry.registerClipboard('powershell', new PowerShellClipboardProvider());
      
      // Load AutoHotkey provider if we're on Windows
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const autohotkeyModule = await import('./autohotkey/index.js');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        AutoHotkeyProvider = autohotkeyModule.AutoHotkeyProvider;
        const autohotkeyProvider = new AutoHotkeyProvider();
        registry.registerKeyboard('autohotkey', autohotkeyProvider.keyboard);
        registry.registerMouse('autohotkey', autohotkeyProvider.mouse);
        registry.registerScreen('autohotkey', autohotkeyProvider.screen);
        registry.registerClipboard('autohotkey', autohotkeyProvider.clipboard);
      } catch (error) {
        console.error('Failed to load AutoHotkey provider:', error);
      }
      
      // Try to load Keysender provider if we're on Windows
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const keysenderModule = await import('./keysender/index.js');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        KeysenderProvider = keysenderModule.KeysenderProvider;
        const keysenderProvider = new KeysenderProvider();
        registry.registerKeyboard('keysender', keysenderProvider.keyboard);
        registry.registerMouse('keysender', keysenderProvider.mouse);
        registry.registerScreen('keysender', keysenderProvider.screen);
        registry.registerClipboard('keysender', keysenderProvider.clipboard);
      } catch (error) {
        console.error('Failed to load Keysender provider:', error);
      }
    } catch (error) {
      console.error('Failed to load Windows-specific providers:', error);
    }
  }

  // TODO: Register other providers as they are implemented
  // registry.registerKeyboard('robotjs', new RobotJSKeyboardProvider());
  // registry.registerMouse('robotjs', new RobotJSMouseProvider());
  // registry.registerScreen('robotjs', new RobotJSScreenProvider());
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
 * Create a dummy provider for non-Windows platforms
 * This is a placeholder that logs warnings when methods are called
 */
class DummyProvider implements AutomationProvider {
  keyboard: KeyboardAutomation = {
    typeText: () => {
      console.warn('Keyboard automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    pressKey: () => {
      console.warn('Keyboard automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    pressKeyCombination: () => {
      console.warn('Keyboard automation is not supported on this platform');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    holdKey: () => {
      console.warn('Keyboard automation is not supported on this platform');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    }
  };

  mouse: MouseAutomation = {
    moveMouse: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    clickMouse: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    doubleClick: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    getCursorPosition: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    scrollMouse: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    dragMouse: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    clickAt: () => {
      console.warn('Mouse automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    }
  };

  screen: ScreenAutomation = {
    getScreenSize: () => {
      console.warn('Screen automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    getActiveWindow: () => {
      console.warn('Screen automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    focusWindow: () => {
      console.warn('Screen automation is not supported on this platform');
      return { success: false, message: 'Not supported on this platform' };
    },
    resizeWindow: () => {
      console.warn('Screen automation is not supported on this platform');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    repositionWindow: () => {
      console.warn('Screen automation is not supported on this platform');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    getScreenshot: () => {
      console.warn('Screen automation is not supported on this platform');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    }
  };

  clipboard: ClipboardAutomation = {
    getClipboardContent: () => {
      console.warn('Using clipboard from DummyProvider');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    setClipboardContent: () => {
      console.warn('Using clipboard from DummyProvider');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    hasClipboardText: () => {
      console.warn('Using clipboard from DummyProvider');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    },
    clearClipboard: () => {
      console.warn('Using clipboard from DummyProvider');
      return Promise.resolve({ success: false, message: 'Not supported on this platform' });
    }
  };
}

/**
 * Create an automation provider instance based on configuration
 * Supports both legacy monolithic providers and new modular providers
 */
// Synchronous version for backward compatibility with existing code
export function createAutomationProvider(config?: AutomationConfig): AutomationProvider {
  // Initialize providers if not already done
  if (registry.getAvailableProviders().clipboards.length === 0) {
    initializeProvidersSync();
  }
  
  return createAutomationProviderImpl(config);
}

// Internal implementation that both sync and async versions use
function createAutomationProviderImpl(config?: AutomationConfig): AutomationProvider {

  if (!config || !config.providers) {
    // Legacy behavior: use monolithic provider
    const type = config?.provider || 'clipboardy';
    const providerType = type.toLowerCase();

    // Return cached instance if available
    if (providerCache[providerType]) {
      return providerCache[providerType];
    }

    let provider: AutomationProvider;

    // Handle Windows-specific providers
    if (providerType === 'keysender' || providerType === 'autohotkey') {
      if (!isWindows()) {
        console.warn(`Provider ${providerType} is only available on Windows. Using dummy provider.`);
        provider = new DummyProvider();
      } else {
        // We're on Windows, so these should be loaded
        try {
          if (providerType === 'keysender' && KeysenderProvider) {
            provider = new KeysenderProvider();
          } else if (providerType === 'autohotkey' && AutoHotkeyProvider) {
            provider = new AutoHotkeyProvider();
          } else {
            throw new Error(`Provider ${providerType} not loaded successfully`);
          }
        } catch (error) {
          console.error(`Failed to create ${providerType} provider:`, error);
          provider = new DummyProvider();
        }
      }
    } else if (providerType === 'clipboardy') {
      // Create a composite provider with ClipboardyProvider for clipboard
      // and dummy implementations for other components
      const dummyProvider = new DummyProvider();
      const clipboardyProvider = new ClipboardyProvider();
      
      provider = new CompositeProvider(
        dummyProvider.keyboard,
        dummyProvider.mouse,
        dummyProvider.screen,
        clipboardyProvider
      );
    } else {
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

  // Prepare fallback provider
  const dummyProvider = new DummyProvider();
  
  // Get individual components from the registry
  let keyboardProvider = dummyProvider.keyboard;
  if (config.providers.keyboard) {
    const provider = registry.getKeyboard(config.providers.keyboard);
    if (provider) {
      keyboardProvider = provider;
    }
  }

  let mouseProvider = dummyProvider.mouse;
  if (config.providers.mouse) {
    const provider = registry.getMouse(config.providers.mouse);
    if (provider) {
      mouseProvider = provider;
    }
  }

  let screenProvider = dummyProvider.screen;
  if (config.providers.screen) {
    const provider = registry.getScreen(config.providers.screen);
    if (provider) {
      screenProvider = provider;
    }
  }

  // Default to ClipboardyProvider for clipboard since it's cross-platform
  let clipboardProvider: ClipboardAutomation;
  if (config.providers.clipboard) {
    const provider = registry.getClipboard(config.providers.clipboard);
    if (provider) {
      clipboardProvider = provider;
    } else {
      clipboardProvider = new ClipboardyProvider();
    }
  } else {
    clipboardProvider = new ClipboardyProvider();
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
