#!/usr/bin/env node
// Test script for verifying screenshot resolution matches reported screen size
// This script takes a screenshot and compares its dimensions with the screen size

// Use dynamic import for ES modules
async function runResolutionTest() {
  // Import the built version of the screenshot and screen utilities
  const { getScreenshot } = await import('../build/tools/screenshot.js');
  const { getScreenSize } = await import('../build/tools/screen.js');
  
  console.log('Testing screenshot resolution against reported screen size...');
  
  // Get the screen size first
  const screenSizeResult = getScreenSize();
  if (!screenSizeResult.success) {
    console.error('❌ Failed to get screen size:', screenSizeResult.message);
    process.exit(1);
  }
  
  console.log(`Screen size reported as: ${screenSizeResult.data.width}x${screenSizeResult.data.height}`);
  
  // Take a full screenshot
  console.log('Taking full screenshot...');
  try {
    const screenshotResult = await getScreenshot();
    if (!screenshotResult.success) {
      console.error('❌ Screenshot failed:', screenshotResult.message);
      process.exit(1);
    }
    
    // Extract dimensions from the screenshot result
    const screenshotWidth = screenshotResult.data?.width;
    const screenshotHeight = screenshotResult.data?.height;
    
    console.log(`Screenshot dimensions: ${screenshotWidth}x${screenshotHeight}`);
    
    // Check if the dimensions match the screen size
    // Note: We'll check for "approximate" match considering scaling/resizing might happen
    const widthRatio = Math.round((screenshotWidth / screenSizeResult.data.width) * 100) / 100;
    const heightRatio = Math.round((screenshotHeight / screenSizeResult.data.height) * 100) / 100;
    
    console.log(`Width ratio: ${widthRatio}, Height ratio: ${heightRatio}`);
    
    // Take another screenshot with the exact dimensions from getScreenSize
    console.log('\nTaking screenshot with native resolution...');
    const nativeScreenshot = await getScreenshot({
      resize: {
        width: screenSizeResult.data.width,
        height: screenSizeResult.data.height,
        fit: 'fill'
      }
    });
    
    if (!nativeScreenshot.success) {
      console.error('❌ Native resolution screenshot failed:', nativeScreenshot.message);
    } else {
      console.log(`Native resolution screenshot dimensions: ${nativeScreenshot.data?.width}x${nativeScreenshot.data?.height}`);
      
      // Check for exact match
      const exactWidthMatch = nativeScreenshot.data?.width === screenSizeResult.data.width;
      const exactHeightMatch = nativeScreenshot.data?.height === screenSizeResult.data.height;
      
      if (exactWidthMatch && exactHeightMatch) {
        console.log('✅ Native resolution screenshot dimensions match reported screen size exactly');
      } else {
        console.log('⚠️ Native resolution screenshot dimensions do not match reported screen size exactly');
        console.log(`  Expected: ${screenSizeResult.data.width}x${screenSizeResult.data.height}`);
        console.log(`  Actual: ${nativeScreenshot.data?.width}x${nativeScreenshot.data?.height}`);
      }
    }
    
    // Summary results
    if (widthRatio > 0.5 && heightRatio > 0.5) {
      console.log('\n✅ Resolution test passed: Screenshot dimensions are proportional to screen size');
    } else {
      console.log('\n❌ Resolution test failed: Screenshot dimensions are not proportional to screen size');
    }
    
  } catch (error) {
    console.error('❌ Test threw exception:', error);
    process.exit(1);
  }
  
  console.log('\nScreenshot resolution testing complete');
}

// Run the tests
runResolutionTest().catch(console.error);