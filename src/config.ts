/**
 * Configuration interface for automation settings
 */
export interface AutomationConfig {
  /**
   * Legacy: The provider to use for all automation
   * Currently supported: 'keysender'
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
    provider: process.env.AUTOMATION_PROVIDER || 'keysender',
  };
}
