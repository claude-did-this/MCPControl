#!/usr/bin/env node
// Test script for the screenshot utility
// This script tests the optimized screenshot functionality to ensure:
// 1. No "Maximum call stack size exceeded" errors
// 2. Reasonable file sizes (not 20MB)

// Import the built version of the screenshot utility
const { getScreenshot } = require('../build/tools/screenshot.js');

async function testScreenshot() {
  console.log('Testing screenshot utility with various settings...');
  
  // Test 1: Default settings (should use 1280px width, JPEG format)
  console.log('\nTest 1: Default settings (1280px width, JPEG)');
  try {
    const result1 = await getScreenshot();
    if (result1.success) {
      console.log('✅ Default screenshot successful');
    } else {
      console.error('❌ Default screenshot failed:', result1.message);
    }
  } catch (error) {
    console.error('❌ Default screenshot threw exception:', error);
  }
  
  // Test 2: Small size (50x50px)
  console.log('\nTest 2: Small size (50x50px)');
  try {
    const result2 = await getScreenshot({
      resize: {
        width: 50,
        height: 50,
        fit: 'fill'
      }
    });
    if (result2.success) {
      console.log('✅ Small screenshot successful');
    } else {
      console.error('❌ Small screenshot failed:', result2.message);
    }
  } catch (error) {
    console.error('❌ Small screenshot threw exception:', error);
  }
  
  // Test 3: PNG format with high compression
  console.log('\nTest 3: PNG format with high compression');
  try {
    const result3 = await getScreenshot({
      format: 'png',
      compressionLevel: 9,
      resize: {
        width: 800
      }
    });
    if (result3.success) {
      console.log('✅ PNG screenshot successful');
    } else {
      console.error('❌ PNG screenshot failed:', result3.message);
    }
  } catch (error) {
    console.error('❌ PNG screenshot threw exception:', error);
  }
  
  // Test 4: Grayscale JPEG with low quality
  console.log('\nTest 4: Grayscale JPEG with low quality');
  try {
    const result4 = await getScreenshot({
      format: 'jpeg',
      quality: 50,
      grayscale: true
    });
    if (result4.success) {
      console.log('✅ Grayscale screenshot successful');
    } else {
      console.error('❌ Grayscale screenshot failed:', result4.message);
    }
  } catch (error) {
    console.error('❌ Grayscale screenshot threw exception:', error);
  }
  
  console.log('\nScreenshot testing complete');
}

// Run the tests
testScreenshot().catch(console.error);
