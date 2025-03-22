/**
 * Configuration interface for automation settings
 */
export interface AutomationConfig {
  /** 
   * The provider to use for automation 
   * Currently supported: 'nutjs' (cross-platform), 'keysender' (Windows only)
   * If not specified, a platform-appropriate default will be used
   */
  provider?: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AutomationConfig {
  return {
    // Allow null provider to use platform-specific defaults
    provider: process.env.AUTOMATION_PROVIDER || undefined
  };
}
