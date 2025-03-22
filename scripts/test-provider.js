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

// Create provider asynchronously
async function run() {
  try {
    // Create provider
    const provider = await createAutomationProvider(config.provider);
    console.log(`Provider created: ${provider.constructor.name}`);
    
    // Print provider details
    console.log('\nProvider components:');
    console.log(`- Keyboard: ${provider.keyboard.constructor.name}`);
    console.log(`- Mouse: ${provider.mouse.constructor.name}`);
    console.log(`- Screen: ${provider.screen.constructor.name}`);
    console.log(`- Clipboard: ${provider.clipboard.constructor.name}`);
    
    return provider;
  } catch (error) {
    console.error('Error creating provider:', error);
    process.exit(1);
  }
}

// Run the async function
const providerPromise = run();

// Test window operations if requested
const testWindowOps = process.argv.includes('--test-window');
if (testWindowOps) {
  // We need to use the async/await pattern to use the provider once it's ready
  providerPromise.then(provider => {
    console.log('\nTesting window operations:');
    
    // Get screen size
    const screenSizeResult = provider.screen.getScreenSize();
    console.log(`\nScreen size: ${JSON.stringify(screenSizeResult.data)}`);
    
    // Get active window
    const activeWindowResult = provider.screen.getActiveWindow();
    console.log(`\nActive window: ${JSON.stringify(activeWindowResult.data)}`);
    
    // Test window focus
    if (activeWindowResult.success && activeWindowResult.data?.title) {
      const windowTitle = activeWindowResult.data.title;
      console.log(`\nFocusing window: "${windowTitle}"`);
      const focusResult = provider.screen.focusWindow(windowTitle);
      console.log(`Focus result: ${focusResult.success ? 'Success' : 'Failed'} - ${focusResult.message}`);
      
      // Test window resize
      console.log(`\nResizing window: "${windowTitle}" to 800x600`);
      const resizeResult = provider.screen.resizeWindow(windowTitle, 800, 600);
      console.log(`Resize result: ${resizeResult.success ? 'Success' : 'Failed'} - ${resizeResult.message}`);
      
      // Wait a bit to see the resize
      console.log('Waiting 2 seconds...');
      setTimeout(() => {
        // Test window reposition
        console.log(`\nRepositioning window: "${windowTitle}" to (100, 100)`);
        const repositionResult = provider.screen.repositionWindow(windowTitle, 100, 100);
        console.log(`Reposition result: ${repositionResult.success ? 'Success' : 'Failed'} - ${repositionResult.message}`);
        
        // Get active window again to verify changes
        setTimeout(() => {
          const updatedWindowResult = provider.screen.getActiveWindow();
          console.log(`\nUpdated window info: ${JSON.stringify(updatedWindowResult.data)}`);
        }, 1000);
      }, 2000);
    }
  }).catch(error => {
    console.error('Error during window testing:', error);
  });
}
