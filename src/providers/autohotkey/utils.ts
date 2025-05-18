/**
 * Utility functions for AutoHotkey provider
 */

/**
 * Get the path to AutoHotkey executable
 * Can be configured via AUTOHOTKEY_PATH environment variable
 */
export function getAutoHotkeyPath(): string {
  return process.env.AUTOHOTKEY_PATH || 'AutoHotkey.exe';
}
