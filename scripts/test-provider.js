// Simple script to test provider selection
import { loadConfig } from '../build/config.js';
import { createAutomationProvider } from '../build/providers/factory.js';

// Override the provider from command line argument if provided
if (process.argv.length > 2) {
  process.env.AUTOMATION_PROVIDER = process.argv[2];
}

// Load configuration
const config = loadConfig();
console.log(`Using provider: ${config.provider}`);

// Create provider
const provider = createAutomationProvider(config.provider);
console.log(`Provider created: ${provider.constructor.name}`);

// Print provider details
console.log('\nProvider components:');
console.log(`- Keyboard: ${provider.keyboard.constructor.name}`);
console.log(`- Mouse: ${provider.mouse.constructor.name}`);
console.log(`- Screen: ${provider.screen.constructor.name}`);
console.log(`- Clipboard: ${provider.clipboard.constructor.name}`);
