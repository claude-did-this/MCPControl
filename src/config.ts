/**
 * Configuration interface for automation settings
 */
export interface AutomationConfig {
  /**
   * The provider to use for automation
   * Currently supported: 'keysender', 'powershell'
   */
  provider: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AutomationConfig {
  return {
    provider: process.env.AUTOMATION_PROVIDER || 'keysender',
  };
}
