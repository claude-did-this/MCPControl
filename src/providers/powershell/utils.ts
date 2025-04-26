import { exec, execSync } from 'child_process';
import { WindowsControlResponse } from '../../types/responses.js';

/**
 * Execute a PowerShell command with proper error handling and configuration
 * 
 * @param script The PowerShell script to execute
 * @param options Additional execution options
 * @returns A standardized response object
 */
export function executePowerShellCommand(
  script: string, 
  options: { 
    timeout?: number,
    maxBuffer?: number 
  } = {}
): WindowsControlResponse {
  try {
    // For debugging: output to stderr only, not stdout which would break JSON-RPC 
    process.stderr.write(`Executing PowerShell command (length: ${script.length} chars)\n`);
    
    // Escape double quotes in the script
    const escapedScript = script.replace(/"/g, '`"');
    
    // Redirect errors to stderr in the PowerShell script itself
    const wrappedScript = `
      try {
        ${escapedScript}
      } catch {
        # Write error to stderr but don't throw so Node can capture it
        [Console]::Error.WriteLine($_.Exception.Message)
        # Return empty string to stdout to avoid breaking JSON parsing
        ""
      }
    `;
    
    // Execute PowerShell with optimized settings
    // -NoProfile speeds up execution by not loading profiles
    // -ExecutionPolicy Bypass ensures scripts can run
    // -NonInteractive prevents hanging on prompts
    const result = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -NonInteractive -Command "${wrappedScript}"`, {
      // Set timeout with default of 30 seconds
      timeout: options.timeout || 30000,
      // Set buffer size with default of 5MB (useful for screenshot operations)
      maxBuffer: options.maxBuffer || 5 * 1024 * 1024,
      // Important: redirect stderr to process.stderr so it doesn't mix with stdout
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    // Check if the result is empty, which might indicate an error was redirected to stderr
    if (!result) {
      process.stderr.write(`Warning: PowerShell command returned empty result\n`);
      return {
        success: false,
        message: 'PowerShell command returned empty result',
      };
    }
    
    process.stderr.write(`PowerShell command executed successfully (result length: ${result.length} chars)\n`);
    return {
      success: true,
      message: 'Command executed successfully',
      data: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`PowerShell execution error: ${errorMessage}\n`);
    
    // Check if error contains stderr output for better error reporting
    if (error instanceof Error && 'stderr' in error) {
      // Need to handle this safely since it's coming from node's exec error
      const errorObject = error as { stderr?: Buffer | string };
      const stderrContent = errorObject.stderr;
      
      let stderr = '';
      if (Buffer.isBuffer(stderrContent)) {
        stderr = stderrContent.toString();
      } else if (typeof stderrContent === 'string') {
        stderr = stderrContent;
      }
      
      if (stderr) {
        process.stderr.write(`PowerShell stderr: ${stderr}\n`);
        return {
          success: false,
          message: `Error executing PowerShell command: ${stderr}`,
        };
      }
    }
    
    return {
      success: false,
      message: `Error executing PowerShell command: ${errorMessage}`,
    };
  }
}

/**
 * Parse JSON from PowerShell command result
 * 
 * @param result The raw command result
 * @param errorPrefix Error message prefix for contextual errors
 * @returns Parsed data or error response
 */
export function parseJsonResult(
  result: WindowsControlResponse, 
  errorPrefix: string = 'Failed to parse data'
): WindowsControlResponse {
  if (result.success && typeof result.data === 'string') {
    try {
      result.data = JSON.parse(result.data);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`JSON parsing error: ${errorMessage}`);
      return {
        success: false,
        message: `${errorPrefix}: ${errorMessage}`,
      };
    }
  }
  return result;
}