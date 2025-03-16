import { AutomationProvider } from '../interfaces/provider.js';
import { NutJSProvider } from './nutjs/index.js';

/**
 * Create an automation provider instance based on the specified type
 */
export function createAutomationProvider(type: string = 'nutjs'): AutomationProvider {
  switch (type.toLowerCase()) {
    case 'nutjs':
      return new NutJSProvider();
    // We'll add more providers in subsequent PRs
    // case 'keysender':
    //   return new KeysenderProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}