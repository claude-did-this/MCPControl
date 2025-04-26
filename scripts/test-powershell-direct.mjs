#!/usr/bin/env node
/**
 * Simple test script for direct PowerShell execution to diagnose issues
 * This bypasses the MCP Control lib and calls PowerShell directly
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper to format errors
function formatError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      ...(error.stderr ? { stderr: error.stderr.toString() } : {})
    };
  }
  return String(error);
}

// Test PowerShell execution without any complex code
function testSimplePowerShell() {
  console.log('\n--- Testing basic PowerShell execution ---');
  try {
    // Test that PowerShell can be executed at all
    const result = execSync('powershell.exe -Command "Write-Output \'Hello from PowerShell\'"', { 
      timeout: 5000,
    }).toString().trim();
    
    console.log('Result:', result);
    console.log('✅ Basic PowerShell execution successful');
    return true;
  } catch (error) {
    console.error('❌ Basic PowerShell execution failed:', formatError(error));
    return false;
  }
}

// Test executing a PowerShell script with JSON output
function testJsonOutput() {
  console.log('\n--- Testing PowerShell JSON output ---');
  try {
    const result = execSync('powershell.exe -Command "ConvertTo-Json @{ test = \'value\'; number = 42 }"', { 
      timeout: 5000,
    }).toString().trim();
    
    console.log('JSON Result:', result);
    try {
      const parsed = JSON.parse(result);
      console.log('Parsed:', parsed);
      console.log('✅ PowerShell JSON output successful');
      return true;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', formatError(parseError));
      return false;
    }
  } catch (error) {
    console.error('❌ PowerShell JSON output failed:', formatError(error));
    return false;
  }
}

// Test accessing Windows Forms and getting screen size
function testWindowsForms() {
  console.log('\n--- Testing Windows Forms access ---');
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bounds = $screen.Bounds
      ConvertTo-Json @{ width = $bounds.Width; height = $bounds.Height }
    `;
    
    const result = execSync(`powershell.exe -Command "${script.replace(/"/g, '\\"')}"`, { 
      timeout: 10000,
    }).toString().trim();
    
    console.log('Screen Size Result:', result);
    try {
      const parsed = JSON.parse(result);
      console.log('Parsed:', parsed);
      console.log('✅ Windows Forms access successful');
      return true;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', formatError(parseError));
      return false;
    }
  } catch (error) {
    console.error('❌ Windows Forms access failed:', formatError(error));
    return false;
  }
}

// Test getting cursor position
function testCursorPosition() {
  console.log('\n--- Testing cursor position ---');
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $position = [System.Windows.Forms.Cursor]::Position
      ConvertTo-Json @{ x = $position.X; y = $position.Y }
    `;
    
    const result = execSync(`powershell.exe -Command "${script.replace(/"/g, '\\"')}"`, { 
      timeout: 5000,
    }).toString().trim();
    
    console.log('Cursor Position Result:', result);
    try {
      const parsed = JSON.parse(result);
      console.log('Parsed:', parsed);
      console.log('✅ Cursor position successful');
      return true;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', formatError(parseError));
      return false;
    }
  } catch (error) {
    console.error('❌ Cursor position failed:', formatError(error));
    return false;
  }
}

// Test screenshot functionality
function testScreenshot() {
  console.log('\n--- Testing screenshot functionality ---');
  try {
    // Create temporary file path
    const tempDir = os.tmpdir();
    const filename = `test-screenshot-${Date.now()}.png`;
    const screenshotPath = path.join(tempDir, filename).replace(/\\/g, '\\\\');
    
    console.log(`Creating screenshot at: ${screenshotPath}`);
    
    // Simplified screenshot script
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      
      $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
      
      $bitmap.Save("${screenshotPath}", [System.Drawing.Imaging.ImageFormat]::Png)
      
      $graphics.Dispose()
      $bitmap.Dispose()
      
      "Screenshot saved to: ${screenshotPath}"
    `;
    
    const result = execSync(`powershell.exe -Command "${script.replace(/"/g, '\\"')}"`, { 
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024,
    }).toString().trim();
    
    console.log('Screenshot Result:', result);
    
    // Check if file was created
    if (fs.existsSync(screenshotPath)) {
      const stats = fs.statSync(screenshotPath);
      console.log(`Screenshot file size: ${stats.size} bytes`);
      
      if (stats.size > 0) {
        console.log('✅ Screenshot creation successful');
        
        // Clean up
        fs.unlinkSync(screenshotPath);
        return true;
      } else {
        console.error('❌ Screenshot file is empty');
        return false;
      }
    } else {
      console.error('❌ Screenshot file was not created');
      return false;
    }
  } catch (error) {
    console.error('❌ Screenshot test failed:', formatError(error));
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting PowerShell direct tests...');
  
  let passCount = 0;
  const testCount = 5;
  
  // Basic tests first
  if (testSimplePowerShell()) passCount++;
  if (testJsonOutput()) passCount++;
  if (testWindowsForms()) passCount++;
  if (testCursorPosition()) passCount++;
  if (testScreenshot()) passCount++;
  
  // Print summary
  console.log('\n--- Test Summary ---');
  console.log(`✅ ${passCount}/${testCount} tests passed`);
  
  if (passCount === testCount) {
    console.log('All PowerShell tests passed! The issue likely lies elsewhere.');
  } else {
    console.log('Some PowerShell tests failed. See details above for which functionality has issues.');
  }
}

// Run tests
runAllTests().catch(console.error);