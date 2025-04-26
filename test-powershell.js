const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('PowerShell Test Script - MCP Control');
console.log('=====================================');

// Test 1: Basic PowerShell execution
console.log('\nTest 1: Basic PowerShell execution');
try {
  const version = execSync('powershell.exe -Command "$PSVersionTable.PSVersion"').toString().trim();
  console.log(`✓ PowerShell is accessible. Version: ${version}`);
} catch (error) {
  console.error(`✗ PowerShell execution failed: ${error.message}`);
  if (error.stderr) {
    console.error(`stderr: ${error.stderr.toString()}`);
  }
}

// Test 2: System.Windows.Forms assembly test
console.log('\nTest 2: System.Windows.Forms assembly test');
try {
  const result = execSync('powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds | ConvertTo-Json"').toString().trim();
  console.log(`✓ System.Windows.Forms is accessible. Screen bounds: ${result}`);
} catch (error) {
  console.error(`✗ System.Windows.Forms test failed: ${error.message}`);
  if (error.stderr) {
    console.error(`stderr: ${error.stderr.toString()}`);
  }
}

// Test 3: Basic screen capture test
console.log('\nTest 3: Basic screen capture test');
try {
  const tempDir = os.tmpdir();
  const testPath = path.join(tempDir, `test-screenshot-${Date.now()}.png`);
  
  console.log(`Saving test screenshot to: ${testPath}`);
  
  const captureScript = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bitmap.Save("${testPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    "Screenshot saved with dimensions: " + $bounds.Width + "x" + $bounds.Height
  `;
  
  const result = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${captureScript.replace(/"/g, '\\"')}"`).toString().trim();
  console.log(`✓ Screenshot test command executed: ${result}`);
  
  // Check if file exists
  if (fs.existsSync(testPath)) {
    const stats = fs.statSync(testPath);
    console.log(`✓ Screenshot file exists with size: ${stats.size} bytes`);
    
    // Clean up
    fs.unlinkSync(testPath);
    console.log('✓ Test file cleaned up');
  } else {
    console.error('✗ Screenshot file was not created');
  }
} catch (error) {
  console.error(`✗ Screenshot test failed: ${error.message}`);
  if (error.stderr) {
    console.error(`stderr: ${error.stderr.toString()}`);
  }
}

// Test 4: Test cursor position
console.log('\nTest 4: Cursor position test');
try {
  const result = execSync('powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; $position = [System.Windows.Forms.Cursor]::Position; ConvertTo-Json @{ x = $position.X; y = $position.Y }"').toString().trim();
  console.log(`✓ Cursor position retrieved: ${result}`);
} catch (error) {
  console.error(`✗ Cursor position test failed: ${error.message}`);
  if (error.stderr) {
    console.error(`stderr: ${error.stderr.toString()}`);
  }
}

console.log('\nTests completed.');