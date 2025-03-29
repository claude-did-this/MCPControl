import { AutomationProvider } from '../interfaces/provider.js';
import { KeysenderProvider } from './keysender/index.js';

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
      provider = new KeysenderProvider();
      break;
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
  
  // Cache the instance
  providerCache[providerType] = provider;
  return provider;
}
