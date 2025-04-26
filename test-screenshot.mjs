import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('PowerShell Screenshot Test - MCP Control');
console.log('========================================');

// Create a simpler screenshot implementation for testing
try {
  // Create temp file
  const tempDir = os.tmpdir();
  const screenshotPath = path.join(tempDir, `screenshot-test-${Date.now()}.png`);
  const escapedPath = screenshotPath.replace(/\\/g, '\\\\');
  
  console.log(`Target screenshot path: ${screenshotPath}`);
  
  // Simpler screenshot script
  const script = `
    # Add required assemblies
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    try {
      # Get screen bounds
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bounds = $screen.Bounds
      
      # Output the dimensions we're capturing
      Write-Output "Capturing screenshot with dimensions: $($bounds.Width)x$($bounds.Height)"
      
      # Create bitmap matching screen size
      $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
      
      # Get graphics context for bitmap
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      
      # Capture screen
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      
      # Path for saving
      $outputPath = "${escapedPath}"
      Write-Output "Saving to: $outputPath"
      
      # Save as PNG
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      
      # Clean up resources
      $graphics.Dispose()
      $bitmap.Dispose()
      
      # Verify file exists and get size
      if (Test-Path $outputPath) {
        $fileInfo = Get-Item $outputPath
        Write-Output "File created successfully: $($fileInfo.Length) bytes"
      } else {
        Write-Output "File was not created at: $outputPath"
      }
      
      # Return successful path for verification
      Write-Output "CAPTURE_SUCCESS:$outputPath"
    }
    catch {
      # Report any errors
      Write-Error "Screenshot capture failed: $_"
      exit 1
    }
  `;
  
  console.log("\nExecuting PowerShell screenshot script...");
  const output = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`, {
    timeout: 30000,
    maxBuffer: 5 * 1024 * 1024
  }).toString();
  
  console.log("\nPowerShell output:");
  console.log("-----------------");
  console.log(output);
  
  // Check if file exists
  if (fs.existsSync(screenshotPath)) {
    const stats = fs.statSync(screenshotPath);
    console.log(`\nVerification: File exists with size ${stats.size} bytes`);
    
    // Clean up
    fs.unlinkSync(screenshotPath);
    console.log('File has been removed after successful test');
  } else {
    console.error('\nERROR: Screenshot file was not created!');
  }
  
} catch (error) {
  console.error(`\nScreenshot capture failed with error: ${error.message}`);
  if (error.stderr) {
    console.error(`\nStderr output:\n${error.stderr.toString()}`);
  }
}