/* eslint-disable */
// Script to compare window handling between Keysender and NutJS providers
import { loadConfig } from '../build/config.js';
import { createAutomationProvider } from '../build/providers/factory.js';

// Test function to try all window operations with a provider
async function testProvider(providerName) {
  console.log(`\n=== TESTING ${providerName.toUpperCase()} PROVIDER ===\n`);
  
  // Configure environment to use the specified provider
  process.env.AUTOMATION_PROVIDER = providerName;
  
  // Load configuration and create provider
  const config = loadConfig();
  console.log(`Using provider: ${config.provider}`);
  
  const provider = createAutomationProvider(config.provider);
  console.log(`Provider created: ${provider.constructor.name}`);
  
  // 1. Get screen size
  console.log('\n1. Getting screen size:');
  const screenSizeResult = provider.screen.getScreenSize();
  console.log(`Success: ${screenSizeResult.success}`);
  console.log(`Message: ${screenSizeResult.message}`);
  console.log(`Data: ${JSON.stringify(screenSizeResult.data)}`);
  
  // 2. Get active window
  console.log('\n2. Getting active window:');
  const activeWindowResult = provider.screen.getActiveWindow();
  console.log(`Success: ${activeWindowResult.success}`);
  console.log(`Message: ${activeWindowResult.message}`);
  console.log(`Data: ${JSON.stringify(activeWindowResult.data)}`);
  
  // Extract window title for later operations
  const windowTitle = activeWindowResult.success && activeWindowResult.data?.title 
    ? activeWindowResult.data.title 
    : "Unknown";
  
  // 3. Focus window
  console.log(`\n3. Focusing window "${windowTitle}":`);
  const focusResult = provider.screen.focusWindow(windowTitle);
  console.log(`Success: ${focusResult.success}`);
  console.log(`Message: ${focusResult.message}`);
  console.log(`Data: ${JSON.stringify(focusResult.data)}`);
  
  // 4. Resize window
  console.log(`\n4. Resizing window "${windowTitle}" to 800x600:`);
  const resizeResult = provider.screen.resizeWindow(windowTitle, 800, 600);
  console.log(`Success: ${resizeResult.success}`);
  console.log(`Message: ${resizeResult.message}`);
  console.log(`Data: ${JSON.stringify(resizeResult.data)}`);
  
  // 5. Reposition window
  console.log(`\n5. Repositioning window "${windowTitle}" to position (100, 100):`);
  const repositionResult = provider.screen.repositionWindow(windowTitle, 100, 100);
  console.log(`Success: ${repositionResult.success}`);
  console.log(`Message: ${repositionResult.message}`);
  console.log(`Data: ${JSON.stringify(repositionResult.data)}`);
  
  // 6. Final window check
  console.log('\n6. Final window check:');
  const finalWindowResult = provider.screen.getActiveWindow();
  console.log(`Success: ${finalWindowResult.success}`);
  console.log(`Message: ${finalWindowResult.message}`);
  console.log(`Data: ${JSON.stringify(finalWindowResult.data)}`);
  
  console.log(`\n=== COMPLETED ${providerName.toUpperCase()} PROVIDER TESTS ===\n`);
}

// Main execution
(async () => {
  try {
    // First test keysender provider
    await testProvider('keysender');
    
    // Only test keysender provider
    // await testProvider('other-provider');
  } catch (error) {
    console.error('Error in testing:', error);
  }
})();
