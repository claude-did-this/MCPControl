# MCPControl Automation Providers

MCPControl supports multiple automation providers to give users flexibility in how they control their systems. Each provider has its own strengths and may work better in different environments.

## Available Providers

### Keysender Provider (Default)

The Keysender provider uses the [keysender](https://github.com/garrettlynch/keysender) library for system automation. It provides comprehensive support for keyboard, mouse, screen, and clipboard operations.

## Selecting a Provider

You can select which provider to use by setting the `AUTOMATION_PROVIDER` environment variable:

```bash
# Use the Keysender provider (default)
AUTOMATION_PROVIDER=keysender node build/index.js
```

### Screen Automation Considerations

The Keysender provider has the following considerations for screen automation:

- **Window Detection Challenges**: Getting accurate window information can be challenging, especially with:
  - Window handles that may not always be valid
  - Window titles that may be empty or not match expected values
  - Position and size information that may be unavailable or return extreme negative values for minimized windows
- **Window Repositioning and Resizing**: Operations work but may not always report accurate results due to limitations in the underlying API
- **Window Focusing**: May not work reliably for all window types or applications
- **Screenshot Functionality**: May not work consistently in all environments

We've implemented significant fallbacks and robust error handling for window operations, including:

- Advanced window selection strategy that prioritizes common applications for better reliability
- Detailed logging to help diagnose window handling issues
- Fallback mechanisms when window operations don't produce the expected results
- Safe property access with type checking to handle edge cases

### Recent Improvements

Recent updates to the provider include:

- Added a sophisticated window finding algorithm that tries multiple strategies to locate usable windows
- Enhanced window resizing and repositioning with better error handling and result verification
- Improved window information retrieval with multiple fallback layers for missing data
- Better window focusing with proper foreground window management and status reporting
- More robust error handling throughout window operations with detailed logging
- Added support for child window detection and management
