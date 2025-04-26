import { KeyboardAutomation } from '../../interfaces/automation.js';
import { KeyboardInput, KeyCombination, KeyHoldOperation } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { executePowerShellCommand } from './utils.js';

export class PowerShellKeyboardAutomation implements KeyboardAutomation {
  private executeCommand(script: string): WindowsControlResponse {
    return executePowerShellCommand(script);
  }

  typeText(input: KeyboardInput): WindowsControlResponse {
    // Escape double quotes in the input text
    const escapedText = input.text.replace(/"/g, '\\"');
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.SendKeys]::SendWait("${escapedText}");
    `;
    return this.executeCommand(script);
  }

  pressKey(key: string): WindowsControlResponse {
    // Map common key names to SendKeys format
    const keyMap: { [key: string]: string } = {
      enter: '{ENTER}',
      tab: '{TAB}',
      escape: '{ESC}',
      backspace: '{BACKSPACE}',
      delete: '{DELETE}',
      home: '{HOME}',
      end: '{END}',
      pageup: '{PGUP}',
      pagedown: '{PGDN}',
      up: '{UP}',
      down: '{DOWN}',
      left: '{LEFT}',
      right: '{RIGHT}',
      capslock: '{CAPSLOCK}',
      printscreen: '{PRTSC}',
      insert: '{INSERT}',
      f1: '{F1}',
      f2: '{F2}',
      f3: '{F3}',
      f4: '{F4}',
      f5: '{F5}',
      f6: '{F6}',
      f7: '{F7}',
      f8: '{F8}',
      f9: '{F9}',
      f10: '{F10}',
      f11: '{F11}',
      f12: '{F12}',
      shift: '+',
      ctrl: '^',
      alt: '%',
      win: '{WIN}',
    };

    const mappedKey = keyMap[key.toLowerCase()] || key;
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.SendKeys]::SendWait("${mappedKey}");
    `;
    return this.executeCommand(script);
  }

  async pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
    // Map modifiers
    const modifiers: { [key: string]: string } = {
      shift: '+',
      ctrl: '^',
      alt: '%',
    };

    // Format the key combination for SendKeys
    let keyCombinationString = '';
    
    // Process modifiers first
    for (const key of combination.keys) {
      const lowerKey = key.toLowerCase();
      if (modifiers[lowerKey]) {
        keyCombinationString += modifiers[lowerKey];
      }
    }

    // Then add the non-modifier key
    for (const key of combination.keys) {
      const lowerKey = key.toLowerCase();
      if (!modifiers[lowerKey]) {
        if (key.length === 1) {
          keyCombinationString += key;
        } else {
          // For special keys like {ENTER} in non-modifier position
          keyCombinationString += `{${key.toUpperCase()}}`;
        }
      }
    }

    // Using await with Promise.resolve to satisfy ESLint require-await rule
    await Promise.resolve();

    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.SendKeys]::SendWait("${keyCombinationString}");
    `;
    return this.executeCommand(script);
  }

  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    // This is a bit trickier in PowerShell/SendKeys
    // We'll use a different approach with user32.dll for key holding
    
    // Using await with Promise.resolve to satisfy ESLint require-await rule
    await Promise.resolve();
    
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class KeyboardOps {
          [DllImport("user32.dll")]
          public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
          
          public static byte VkKeyScan(char ch) {
            return (byte)((short)ch & 0xff);
          }
          
          public const int KEYEVENTF_KEYDOWN = 0x0000;
          public const int KEYEVENTF_KEYUP = 0x0002;
        }
"@;
      
      $key = "${operation.key}";
      $vkCode = 0;
      
      # Map common keys to virtual key codes
      $keyMap = @{
        "enter" = 0x0D;
        "tab" = 0x09;
        "escape" = 0x1B;
        "backspace" = 0x08;
        "delete" = 0x2E;
        "space" = 0x20;
        "shift" = 0x10;
        "ctrl" = 0x11;
        "alt" = 0x12;
        "capslock" = 0x14;
        "home" = 0x24;
        "end" = 0x23;
        "pageup" = 0x21;
        "pagedown" = 0x22;
        "up" = 0x26;
        "down" = 0x28;
        "left" = 0x25;
        "right" = 0x27;
      };
      
      if ($keyMap.ContainsKey($key.ToLower())) {
        $vkCode = $keyMap[$key.ToLower()];
      } elseif ($key.Length -eq 1) {
        $vkCode = [KeyboardOps]::VkKeyScan($key[0]);
      }
      
      if ($vkCode -ne 0) {
        if ("${operation.state}" -eq "down") {
          [KeyboardOps]::keybd_event($vkCode, 0, [KeyboardOps]::KEYEVENTF_KEYDOWN, [UIntPtr]::Zero);
          if (${operation.duration}) {
            Start-Sleep -Milliseconds ${operation.duration ?? 0};
            [KeyboardOps]::keybd_event($vkCode, 0, [KeyboardOps]::KEYEVENTF_KEYUP, [UIntPtr]::Zero);
          }
        } else {
          [KeyboardOps]::keybd_event($vkCode, 0, [KeyboardOps]::KEYEVENTF_KEYUP, [UIntPtr]::Zero);
        }
        "Key operation successful for $key"
      } else {
        throw "Invalid key: $key"
      }
    `;
    return this.executeCommand(script);
  }
}