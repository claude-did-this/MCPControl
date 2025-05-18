// Simple test script to verify AutoHotkey provider works
import { createAutomationProvider } from './build/providers/factory.js';

// Use AutoHotkey as the provider
const provider = createAutomationProvider({ provider: 'autohotkey' });

console.log('AutoHotkey provider created successfully');
console.log('Provider has keyboard:', !!provider.keyboard);
console.log('Provider has mouse:', !!provider.mouse);
console.log('Provider has screen:', !!provider.screen);
console.log('Provider has clipboard:', !!provider.clipboard);

// You can also use modular configuration
const modularProvider = createAutomationProvider({
  providers: {
    keyboard: 'autohotkey',
    mouse: 'autohotkey',
    screen: 'autohotkey',
    clipboard: 'autohotkey',
  },
});

console.log('\nModular provider created successfully');