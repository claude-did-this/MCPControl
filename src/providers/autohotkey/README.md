# AutoHotkey Provider for MCPControl

This provider implements the MCPControl automation interfaces using AutoHotkey v2.

## Prerequisites

- AutoHotkey v2.0 or later must be installed on the system
- `AutoHotkey.exe` must be available in the system PATH
- Windows operating system (AutoHotkey is Windows-only)

## Installation

AutoHotkey can be downloaded from: https://www.autohotkey.com/

Make sure to install version 2.0 or later.

## Usage

### Using as the primary provider

```javascript
const provider = createAutomationProvider({ provider: 'autohotkey' });
```

### Using in modular configuration

```javascript
const provider = createAutomationProvider({
  providers: {
    keyboard: 'autohotkey',
    mouse: 'autohotkey',
    screen: 'autohotkey',
    clipboard: 'autohotkey',
  },
});
```

### Environment Variables

Set the automation provider to AutoHotkey:

```bash
export AUTOMATION_PROVIDER=autohotkey
```

Configure the AutoHotkey executable path (optional):

```bash
export AUTOHOTKEY_PATH="C:\Program Files\AutoHotkey\v2\AutoHotkey.exe"
```

Or use modular configuration:

```bash
export AUTOMATION_KEYBOARD_PROVIDER=autohotkey
export AUTOMATION_MOUSE_PROVIDER=autohotkey
export AUTOMATION_SCREEN_PROVIDER=autohotkey
export AUTOMATION_CLIPBOARD_PROVIDER=autohotkey
```

## Features

### Keyboard Automation
- Type text
- Press individual keys
- Press key combinations
- Hold and release keys

### Mouse Automation
- Move mouse to position
- Click mouse buttons
- Double-click
- Scroll
- Drag operations
- Get cursor position

### Screen Automation
- Get screen size
- Capture screenshots
- Get pixel colors
- Window management (focus, resize, reposition)
- Get active window information

### Clipboard Automation
- Set clipboard content
- Get clipboard content
- Check if clipboard has text
- Clear clipboard

## Implementation Notes

The AutoHotkey provider executes AutoHotkey v2 scripts for each operation. This means:

1. Each operation creates a temporary `.ahk` script file
2. The script is executed via `AutoHotkey.exe`
3. Results are captured through temporary files or script output
4. Temporary files are cleaned up after execution

## Performance Considerations

Since each operation requires creating and executing a script, there is some overhead compared to native implementations. For high-frequency operations, consider batching operations or using a different provider.

## Error Handling

If AutoHotkey is not installed or not in the PATH, operations will fail with an error message. Make sure AutoHotkey v2 is properly installed and accessible.

## Known Limitations

1. Screenshot functionality is basic and uses Windows built-in tools (Paint, Snipping Tool)
2. Some operations may have timing issues due to the script execution model
3. Only works on Windows systems
4. Requires AutoHotkey v2 syntax (not compatible with v1)

## Debugging

To debug AutoHotkey scripts, you can:

1. Check the temporary script files generated in the system temp directory
2. Run the scripts manually with AutoHotkey to see any error messages
3. Enable AutoHotkey debugging features

## Contributing

When contributing to the AutoHotkey provider:

1. Ensure all scripts use AutoHotkey v2 syntax
2. Test on Windows with AutoHotkey v2 installed
3. Handle errors gracefully
4. Clean up temporary files properly
5. Follow the existing code structure and patterns