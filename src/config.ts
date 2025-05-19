/**
 * Configuration interface for automation settings
 */
export interface AutomationConfig {
  /**
   * Legacy: The provider to use for all automation
   * Currently supported: 'keysender', 'autohotkey'
   */
  provider?: string;

  /**
   * New: Modular provider configuration
   * Allows mixing different providers for different components
   */
  providers?: {
    keyboard?: string;
    mouse?: string;
    screen?: string;
    clipboard?: string;
  };
}

/**
 * Check if running on Windows platform
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Get default provider based on platform
 */
export function getDefaultProvider(): string {
  // On Windows, keysender is the default
  // On non-Windows platforms, use clipboardy as it's cross-platform
  return isWindows() ? 'keysender' : 'clipboardy';
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AutomationConfig {
  // Check for new modular configuration
  const keyboard = process.env.AUTOMATION_KEYBOARD_PROVIDER;
  const mouse = process.env.AUTOMATION_MOUSE_PROVIDER;
  const screen = process.env.AUTOMATION_SCREEN_PROVIDER;
  const clipboard = process.env.AUTOMATION_CLIPBOARD_PROVIDER;

  if (keyboard || mouse || screen || clipboard) {
    return {
      providers: {
        keyboard,
        mouse,
        screen,
        clipboard,
      },
    };
  }

  // Fall back to legacy configuration
  return {
    provider: process.env.AUTOMATION_PROVIDER || getDefaultProvider(),
  };
}
