import { AutomationProvider } from '../interfaces/provider.js';
import { KeysenderProvider } from './keysender/index.js';
import { PowerShellProvider } from './powershell/index.js';

// Cache to store provider instances
const providerCache: Record<string, AutomationProvider> = {};

/**
 * Create an automation provider instance based on the specified type
 * Uses a caching mechanism to avoid creating multiple instances of the same provider
 */
export function createAutomationProvider(type: string = 'keysender'): AutomationProvider {
  const providerType = type.toLowerCase();

  // Return cached instance if available
  if (providerCache[providerType]) {
    return providerCache[providerType];
  }

  let provider: AutomationProvider;
  switch (providerType) {
    case 'keysender':
      try {
        provider = new KeysenderProvider();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize keysender provider: ${errorMessage}`);
      }
      break;
    case 'powershell':
      try {
        provider = new PowerShellProvider();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize powershell provider: ${errorMessage}`);
      }
      break;
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }

  // Cache the instance
  providerCache[providerType] = provider;
  return provider;
}
