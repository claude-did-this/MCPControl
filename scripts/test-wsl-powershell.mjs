#!/usr/bin/env node
/**
 * Test script specifically for Windows Subsystem for Linux (WSL) environments
 * Tests PowerShell execution from WSL to identify potential issues
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

// Test WSL environment
function testWslEnvironment() {
  console.log('\n--- Testing WSL Environment ---');
  try {
    const wslVersion = execSync('wsl.exe --version').toString().trim();
    console.log('WSL Version:', wslVersion);
    
    const isWsl = execSync('test -f /proc/sys/kernel/osrelease && cat /proc/sys/kernel/osrelease | grep -i microsoft && echo YES || echo NO', { 
      timeout: 5000 
    }).toString().trim();
    
    console.log('Is running in WSL:', isWsl === 'YES' ? 'Yes' : 'No');
    
    console.log('Environment variables:');
    console.log('PATH:', process.env.PATH);
    console.log('WSLENV:', process.env.WSLENV);
    
    return true;
  } catch (error) {
    console.error('❌ WSL environment check failed:', formatError(error));
    return false;
  }
}

// Test PowerShell availability
function testPowerShellAvailability() {
  console.log('\n--- Testing PowerShell Availability ---');
  try {
    // Check if PowerShell is available directly
    const psDirectResult = execSync('which powershell.exe || echo "Not found"', { 
      timeout: 5000 
    }).toString().trim();
    
    console.log('powershell.exe path:', psDirectResult);
    
    // Check using Windows path
    const winPath = execSync('powershell.exe -Command "[Environment]::GetFolderPath(\'System\')"', { 
      timeout: 5000 
    }).toString().trim();
    
    console.log('Windows System path:', winPath);
    
    // Try with explicit path to PowerShell
    const explicitPath = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
    
    if (fs.existsSync(explicitPath)) {
      console.log(`PowerShell exists at explicit path: ${explicitPath}`);
      
      const explicitResult = execSync(`${explicitPath} -Command "Write-Output 'Testing explicit path'"`, { 
        timeout: 5000 
      }).toString().trim();
      
      console.log('Explicit path result:', explicitResult);
      console.log('✅ PowerShell is available');
    } else {
      console.log(`❌ PowerShell not found at expected path: ${explicitPath}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ PowerShell availability check failed:', formatError(error));
    return false;
  }
}

// Test permissions for PowerShell in WSL
function testPowerShellPermissions() {
  console.log('\n--- Testing PowerShell Permissions ---');
  try {
    // Check execution policy
    const executionPolicy = execSync('powershell.exe -Command "Get-ExecutionPolicy"', { 
      timeout: 5000 
    }).toString().trim();
    
    console.log('PowerShell Execution Policy:', executionPolicy);
    
    // Check if we can access special folders that might require elevation
    const script = `
      $tempFile = [System.IO.Path]::GetTempFileName()
      Set-Content -Path $tempFile -Value "Test content"
      $exists = Test-Path $tempFile
      Remove-Item -Path $tempFile -Force
      Write-Output "Temp file test: $exists"
    `;
    
    const tempFileTest = execSync(`powershell.exe -Command "${script.replace(/"/g, '\\"')}"`, { 
      timeout: 10000 
    }).toString().trim();
    
    console.log('Temp file test:', tempFileTest);
    
    // Check if we can access Windows Forms functionality
    const formsTest = execSync('powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; Write-Output \'Windows Forms loaded\'"', { 
      timeout: 10000 
    }).toString().trim();
    
    console.log('Windows Forms test:', formsTest);
    
    console.log('✅ PowerShell permissions test passed');
    return true;
  } catch (error) {
    console.error('❌ PowerShell permissions test failed:', formatError(error));
    return false;
  }
}

// Test various PowerShell execution options
function testPowerShellExecutionOptions() {
  console.log('\n--- Testing PowerShell Execution Options ---');
  
  const variants = [
    {
      name: 'Basic Command',
      command: 'powershell.exe -Command "Write-Output \'Basic\'"'
    },
    {
      name: 'Non-Interactive Mode',
      command: 'powershell.exe -NonInteractive -Command "Write-Output \'Non-Interactive\'"'
    },
    {
      name: 'No Profile',
      command: 'powershell.exe -NoProfile -Command "Write-Output \'No Profile\'"'
    },
    {
      name: 'Execution Policy Bypass',
      command: 'powershell.exe -ExecutionPolicy Bypass -Command "Write-Output \'Execution Policy Bypass\'"'
    },
    {
      name: 'All Options',
      command: 'powershell.exe -NoProfile -ExecutionPolicy Bypass -NonInteractive -Command "Write-Output \'All Options\'"'
    },
    {
      name: 'With Error Redirection',
      command: 'powershell.exe -Command "Write-Output \'Success\'; Write-Error \'Error test\'"'
    }
  ];
  
  let passCount = 0;
  
  for (const variant of variants) {
    console.log(`\nTesting: ${variant.name}`);
    try {
      const result = execSync(variant.command, { 
        timeout: 10000
      }).toString().trim();
      
      console.log('Result:', result);
      console.log(`✅ ${variant.name} succeeded`);
      passCount++;
    } catch (error) {
      console.error(`❌ ${variant.name} failed:`, formatError(error));
    }
  }
  
  console.log(`\nExecution Options Summary: ${passCount}/${variants.length} passed`);
  return passCount === variants.length;
}

// Test screen capture in WSL
function testWslScreenCapture() {
  console.log('\n--- Testing Screen Capture in WSL ---');
  try {
    const tempDir = os.tmpdir();
    const filename = `wsl-test-screenshot-${Date.now()}.png`;
    const screenshotPath = path.join(tempDir, filename).replace(/\\/g, '\\\\');
    
    console.log(`Creating screenshot at: ${screenshotPath}`);
    
    // Simplified script with enhanced error output
    const script = `
      try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        Write-Output "Assemblies loaded successfully"
        
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        Write-Output "Screen bounds: $($bounds.Width)x$($bounds.Height)"
        
        $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        Write-Output "Bitmap created"
        
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        Write-Output "Graphics object created"
        
        $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
        Write-Output "Screen copied to bitmap"
        
        $bitmap.Save("${screenshotPath}", [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "Bitmap saved to file"
        
        $graphics.Dispose()
        $bitmap.Dispose()
        Write-Output "Resources disposed"
        
        if (Test-Path "${screenshotPath}") {
          $fileInfo = Get-Item "${screenshotPath}"
          Write-Output "File created successfully: $($fileInfo.Length) bytes"
        } else {
          Write-Output "File was not created for some reason"
        }
        
        "Screenshot saved to: ${screenshotPath}"
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
        Write-Output "ERROR TYPE: $($_.Exception.GetType().FullName)"
        Write-Output "STACK TRACE: $($_.ScriptStackTrace)"
        throw
      }
    `;
    
    const result = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, { 
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024
    }).toString().trim();
    
    console.log('Screenshot process output:');
    console.log(result);
    
    // Check if file was created
    if (fs.existsSync(screenshotPath)) {
      const stats = fs.statSync(screenshotPath);
      console.log(`Screenshot file size: ${stats.size} bytes`);
      
      if (stats.size > 0) {
        console.log('✅ WSL screenshot creation successful');
        
        // Clean up
        fs.unlinkSync(screenshotPath);
        return true;
      } else {
        console.error('❌ WSL screenshot file is empty');
        return false;
      }
    } else {
      console.error('❌ WSL screenshot file was not created');
      return false;
    }
  } catch (error) {
    console.error('❌ WSL screen capture test failed:', formatError(error));
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting WSL-PowerShell integration tests...');
  
  let passCount = 0;
  const testCount = 5;
  
  // Environment tests
  if (testWslEnvironment()) passCount++;
  if (testPowerShellAvailability()) passCount++;
  if (testPowerShellPermissions()) passCount++;
  if (testPowerShellExecutionOptions()) passCount++;
  if (testWslScreenCapture()) passCount++;
  
  // Print summary
  console.log('\n--- Test Summary ---');
  console.log(`✅ ${passCount}/${testCount} tests passed`);
  
  if (passCount === testCount) {
    console.log('All WSL-PowerShell tests passed! The issue may be in the Node.js integration layer.');
  } else {
    console.log('Some WSL-PowerShell tests failed. There may be WSL-specific issues to address.');
  }
}

// Run tests
runAllTests().catch(console.error);