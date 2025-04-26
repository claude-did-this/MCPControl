import { execSync } from 'child_process';
import { WindowsControlResponse } from '../../types/responses.js';

/**
 * Execute a PowerShell command with simplified error handling
 * This version removes the script wrapping that might be causing issues
 * 
 * @param script The PowerShell script to execute
 * @param options Additional execution options
 * @returns A standardized response object
 */
export function executeSimplePowerShellCommand(
  script: string, 
  options: { 
    timeout?: number,
    maxBuffer?: number,
    debug?: boolean
  } = {}
): WindowsControlResponse {
  const { debug = false } = options;
  
  try {
    if (debug) {
      process.stderr.write(`Executing PowerShell command (length: ${script.length} chars)\n`);
      process.stderr.write(`Command: ${script}\n`);
    }
    
    // Escape double quotes in the script
    const escapedScript = script.replace(/"/g, '\\"');
    
    // Execute PowerShell without try/catch wrapper that might be causing issues
    const result = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -NonInteractive -Command "${escapedScript}"`, {
      timeout: options.timeout || 30000,
      maxBuffer: options.maxBuffer || 5 * 1024 * 1024
    }).toString().trim();
    
    // Check if the result is empty, which might indicate an error
    if (!result) {
      if (debug) {
        process.stderr.write(`Warning: PowerShell command returned empty result\n`);
      }
      return {
        success: false,
        message: 'PowerShell command returned empty result',
      };
    }
    
    if (debug) {
      process.stderr.write(`PowerShell command executed successfully (result length: ${result.length} chars)\n`);
      process.stderr.write(`Result: ${result}\n`);
    }
    
    return {
      success: true,
      message: 'Command executed successfully',
      data: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (debug) {
      process.stderr.write(`PowerShell execution error: ${errorMessage}\n`);
      
      if (error instanceof Error && 'stderr' in error) {
        const errorObject = error as unknown as { stderr?: Buffer | string };
        if (errorObject.stderr) {
          const stderr = Buffer.isBuffer(errorObject.stderr) 
            ? errorObject.stderr.toString() 
            : String(errorObject.stderr);
          process.stderr.write(`PowerShell stderr: ${stderr}\n`);
        }
      }
    }
    
    return {
      success: false,
      message: `Error executing PowerShell command: ${errorMessage}`,
    };
  }
}

/**
 * A simpler version of the JSON parser
 */
export function parseSimpleJsonResult(
  result: WindowsControlResponse
): WindowsControlResponse {
  if (result.success && typeof result.data === 'string') {
    try {
      result.data = JSON.parse(result.data);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to parse JSON data: ${errorMessage}`,
      };
    }
  }
  return result;
}