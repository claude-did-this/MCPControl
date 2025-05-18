// Direct test of AutoHotkey provider without factory
import { AutoHotkeyProvider } from './build/providers/autohotkey/index.js';

// Create the provider directly
const provider = new AutoHotkeyProvider();

console.log('AutoHotkey provider created successfully');
console.log('Provider has keyboard:', !!provider.keyboard);
console.log('Provider has mouse:', !!provider.mouse);
console.log('Provider has screen:', !!provider.screen);
console.log('Provider has clipboard:', !!provider.clipboard);

// Test a simple keyboard operation
console.log('\nTesting keyboard.typeText method...');
const result = provider.keyboard.typeText({ text: 'Hello from AutoHotkey!' });
console.log('Result:', result);

console.log('\nAutoHotkey provider is ready to use!');