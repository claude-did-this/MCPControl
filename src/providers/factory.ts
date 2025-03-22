import { AutomationProvider } from '../interfaces/provider.js';
import { KeysenderProvider } from './keysender/index.js';

// Conditionally import NutJSProvider
// This allows builds without NutJS dependency
let NutJSProvider: any;
try {
  // Dynamic import to prevent build-time dependency
  const nutjsModule = await import('./nutjs/index.js');
  NutJSProvider = nutjsModule.NutJSProvider;
} catch (error) {
  // NutJS provider not available - this is expected in some environments
  console.log('NutJS provider not available');
}

// Cache to store provider instances
const providerCache: Record<string, AutomationProvider> = {};

/**
 * Detect the current platform
 * @returns Platform identifier: 'win32', 'darwin', 'linux', or 'unknown'
 */
function detectPlatform(): string {
  return process.platform || 'unknown';
}

/**
 * Determine the best provider based on the current platform
 * @returns Provider type string
 */
function getDefaultProvider(): string {
  const platform = detectPlatform();
  
  // On Windows, prefer keysender
  if (platform === 'win32') {
    return 'keysender';
  }
  
  // On other platforms, use NutJS if available
  return NutJSProvider ? 'nutjs' : 'keysender';
}

/**
 * Create an automation provider instance based on the specified type
 * Uses a caching mechanism to avoid creating multiple instances of the same provider
 */
export function createAutomationProvider(type?: string): AutomationProvider {
  // If no type specified, use platform-specific default
  const providerType = (type || getDefaultProvider()).toLowerCase();
  
  // Return cached instance if available
  if (providerCache[providerType]) {
    console.log(`Using cached provider instance: ${providerType}`);
    return providerCache[providerType];
  }
  
  console.log(`Creating new provider instance: ${providerType}`);
  
  let provider: AutomationProvider;
  switch (providerType) {
    case 'nutjs':
      if (!NutJSProvider) {
        throw new Error('NutJS provider is not available in this build');
      }
      provider = new NutJSProvider();
      break;
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
