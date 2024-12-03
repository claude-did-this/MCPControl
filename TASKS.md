# NutJS Windows Control Implementation Tasks

## Window Management Functions
**Documentation**: https://nutjs.dev/modules/window
- [ ] List all windows
- [~] Get active window (partial - title and size implemented, position pending)
- [x] Get window title
- [x] Get window size and position
- [ ] Focus window
- [ ] Resize window
- [ ] Reposition window
- [ ] Minimize window
- [ ] Restore window

## Mouse Functions
**Documentation**: https://nutjs.dev/modules/mouse
- [x] Mouse scroll (up/down)
- [ ] Mouse drag operations
- [ ] Set mouse movement speed

## Screen Functions
**Documentation**: https://nutjs.dev/modules/screen
- [ ] Get screen info (beyond current screenshot/size functionality)

## Keyboard Functions
**Documentation**: https://nutjs.dev/modules/keyboard
- [ ] Add support for key combinations
- [ ] Add support for key holding/releasing

## Integration Functions
**Documentation**: https://nutjs.dev/modules/integration
- [ ] Add clipboard support
  - Note: Implementation requires proper nut.js clipboard plugin/integration. Current libnut-core does not include clipboard functionality. Hold off implementation until proper integration method is determined.
- [ ] Add support for finding UI elements

## Implementation Steps for Each Task
1. Add appropriate TypeScript interfaces in types.ts
2. Add the tool definition in setupTools()
3. Implement the tool handler function
4. Add error handling and response formatting

## Current Implementation Status
### Completed ✅
- Basic mouse movement and clicking
- Basic keyboard input
- Screen capture and size
- Cursor position tracking
- Basic active window detection (title, size, and position)
- Mouse scrolling (up/down)

### Pending ❌
- Complete window management (manipulation)
- Advanced mouse operations
- Advanced keyboard operations
- Clipboard operations
- UI element finding

## References
- NutJS GitHub Repository: https://github.com/nut-tree/nut.js
- API Documentation: https://nutjs.dev/
