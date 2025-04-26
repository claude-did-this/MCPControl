import { MouseAutomation } from '../../interfaces/automation.js';
import { MousePosition } from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { executePowerShellCommand, parseJsonResult } from './utils.js';

export class PowerShellMouseAutomation implements MouseAutomation {
  private executeCommand(script: string): WindowsControlResponse {
    return executePowerShellCommand(script);
  }

  moveMouse(position: MousePosition): WindowsControlResponse {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${position.x}, ${position.y});
      "Moved cursor to X:${position.x}, Y:${position.y}"
    `;
    return this.executeCommand(script);
  }

  clickMouse(button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    // Define mouse button constants
    const buttonMap = {
      left: 'Left',
      right: 'Right',
      middle: 'Middle',
    };

    const mappedButton = buttonMap[button];
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class MouseOperations {
            [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
            public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
            
            public const int MOUSEEVENTF_LEFTDOWN = 0x02;
            public const int MOUSEEVENTF_LEFTUP = 0x04;
            public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
            public const int MOUSEEVENTF_RIGHTUP = 0x10;
            public const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
            public const int MOUSEEVENTF_MIDDLEUP = 0x40;
        }
"@;
      
      $currentPosition = [System.Windows.Forms.Cursor]::Position;
      
      switch ("${mappedButton}") {
        "Left" {
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTDOWN, $currentPosition.X, $currentPosition.Y, 0, 0);
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTUP, $currentPosition.X, $currentPosition.Y, 0, 0);
          "Left clicked at X:$($currentPosition.X), Y:$($currentPosition.Y)"
        }
        "Right" {
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_RIGHTDOWN, $currentPosition.X, $currentPosition.Y, 0, 0);
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_RIGHTUP, $currentPosition.X, $currentPosition.Y, 0, 0);
          "Right clicked at X:$($currentPosition.X), Y:$($currentPosition.Y)"
        }
        "Middle" {
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_MIDDLEDOWN, $currentPosition.X, $currentPosition.Y, 0, 0);
          [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_MIDDLEUP, $currentPosition.X, $currentPosition.Y, 0, 0);
          "Middle clicked at X:$($currentPosition.X), Y:$($currentPosition.Y)"
        }
      }
    `;
    return this.executeCommand(script);
  }

  doubleClick(position?: MousePosition): WindowsControlResponse {
    let script: string;
    
    if (position) {
      script = `
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${position.x}, ${position.y});
        
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          
          public class MouseOperations {
              [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
              public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
              
              public const int MOUSEEVENTF_LEFTDOWN = 0x02;
              public const int MOUSEEVENTF_LEFTUP = 0x04;
          }
"@;
        
        # First click
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTDOWN, [uint32]${position.x}, [uint32]${position.y}, 0, 0);
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTUP, [uint32]${position.x}, [uint32]${position.y}, 0, 0);
        
        # Brief delay between clicks
        Start-Sleep -Milliseconds 10;
        
        # Second click
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTDOWN, [uint32]${position.x}, [uint32]${position.y}, 0, 0);
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTUP, [uint32]${position.x}, [uint32]${position.y}, 0, 0);
        
        "Double-clicked at X:${position.x}, Y:${position.y}"
      `;
    } else {
      script = `
        Add-Type -AssemblyName System.Windows.Forms;
        $position = [System.Windows.Forms.Cursor]::Position;
        
        Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          
          public class MouseOperations {
              [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
              public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
              
              public const int MOUSEEVENTF_LEFTDOWN = 0x02;
              public const int MOUSEEVENTF_LEFTUP = 0x04;
          }
"@;
        
        # First click
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTDOWN, [uint32]$position.X, [uint32]$position.Y, 0, 0);
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTUP, [uint32]$position.X, [uint32]$position.Y, 0, 0);
        
        # Brief delay between clicks
        Start-Sleep -Milliseconds 10;
        
        # Second click
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTDOWN, [uint32]$position.X, [uint32]$position.Y, 0, 0);
        [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_LEFTUP, [uint32]$position.X, [uint32]$position.Y, 0, 0);
        
        "Double-clicked at X:$($position.X), Y:$($position.Y)"
      `;
    }
    
    return this.executeCommand(script);
  }

  getCursorPosition(): WindowsControlResponse {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $position = [System.Windows.Forms.Cursor]::Position;
      ConvertTo-Json @{ x = $position.X; y = $position.Y }
    `;
    const result = this.executeCommand(script);
    return parseJsonResult(result, 'Failed to parse cursor position');
  }

  scrollMouse(amount: number): WindowsControlResponse {
    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class MouseOperations {
            [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
            public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
            
            public const int MOUSEEVENTF_WHEEL = 0x0800;
        }
"@;
      
      [MouseOperations]::mouse_event([MouseOperations]::MOUSEEVENTF_WHEEL, 0, 0, [uint32]${amount}, 0);
      "Scrolled mouse by ${amount} units"
    `;
    return this.executeCommand(script);
  }

  dragMouse(
    from: MousePosition,
    to: MousePosition,
    button: 'left' | 'right' | 'middle' = 'left'
  ): WindowsControlResponse {
    const buttonMap = {
      left: 'MOUSEEVENTF_LEFTDOWN',
      right: 'MOUSEEVENTF_RIGHTDOWN',
      middle: 'MOUSEEVENTF_MIDDLEDOWN',
    };
    
    const buttonUpMap = {
      left: 'MOUSEEVENTF_LEFTUP',
      right: 'MOUSEEVENTF_RIGHTUP',
      middle: 'MOUSEEVENTF_MIDDLEUP',
    };

    const script = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class MouseOperations {
            [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
            public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
            
            [DllImport("user32.dll")]
            public static extern bool SetCursorPos(int X, int Y);
            
            public const int MOUSEEVENTF_LEFTDOWN = 0x02;
            public const int MOUSEEVENTF_LEFTUP = 0x04;
            public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
            public const int MOUSEEVENTF_RIGHTUP = 0x10;
            public const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
            public const int MOUSEEVENTF_MIDDLEUP = 0x40;
            public const int MOUSEEVENTF_MOVE = 0x0001;
        }
"@;
      
      # Move to start position
      [MouseOperations]::SetCursorPos(${from.x}, ${from.y});
      
      # Press mouse button down
      [MouseOperations]::mouse_event([MouseOperations]::${buttonMap[button]}, 0, 0, 0, 0);
      
      # Move to end position (with a small delay)
      Start-Sleep -Milliseconds 50;
      [MouseOperations]::SetCursorPos(${to.x}, ${to.y});
      Start-Sleep -Milliseconds 50;
      
      # Release mouse button
      [MouseOperations]::mouse_event([MouseOperations]::${buttonUpMap[button]}, 0, 0, 0, 0);
      
      "Dragged from X:${from.x}, Y:${from.y} to X:${to.x}, Y:${to.y} using ${button} button"
    `;
    return this.executeCommand(script);
  }

  clickAt(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): WindowsControlResponse {
    // Move to position and click
    const position = { x, y };
    this.moveMouse(position);
    return this.clickMouse(button);
  }
}