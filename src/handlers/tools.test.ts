import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupTools } from './tools.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock all tool modules
vi.mock('../tools/mouse.js', () => ({
  moveMouse: vi.fn(() => ({ success: true, message: 'Mouse moved' })),
  clickMouse: vi.fn(),
  doubleClick: vi.fn(),
  getCursorPosition: vi.fn(),
  scrollMouse: vi.fn(),
  dragMouse: vi.fn(),
  clickAt: vi.fn(),
}));

vi.mock('../tools/keyboard.js', () => ({
  typeText: vi.fn(() => ({ success: true, message: 'Text typed' })),
  pressKey: vi.fn(() => ({ success: true, message: 'Key pressed' })),
  pressKeyCombination: vi.fn().mockImplementation((combination) => {
    // Check if the combination includes control key
    if (combination.keys.some((k: string) => k.toLowerCase() === 'control')) {
      return Promise.resolve({
        success: false,
        message: 'Control key combinations are temporarily disabled due to stability issues',
      });
    } else {
      return Promise.resolve({
        success: true,
        message: `Pressed key combination: ${combination.keys.join('+')}`,
      });
    }
  }),
  holdKey: vi.fn(),
}));

vi.mock('../tools/screen.js', () => ({
  getScreenSize: vi.fn(),
  getActiveWindow: vi.fn(),
  focusWindow: vi.fn(),
  resizeWindow: vi.fn(),
  repositionWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  restoreWindow: vi.fn(),
}));

// Mock the automation provider factory
vi.mock('../providers/factory.js', () => {
  // Create mock provider with all required automation interfaces
  const mockKeyboardAutomation = {
    typeText: vi.fn(() => ({ success: true, message: 'Text typed' })),
    pressKey: vi.fn(() => ({ success: true, message: 'Key pressed' })),
    pressKeyCombination: vi.fn().mockImplementation((combination) => {
      // Check if the combination includes control key
      if (combination.keys.some((k: string) => k.toLowerCase() === 'control')) {
        return Promise.resolve({
          success: false,
          message: 'Control key combinations are temporarily disabled due to stability issues',
        });
      } else {
        return Promise.resolve({
          success: true,
          message: `Pressed key combination: ${combination.keys.join('+')}`,
        });
      }
    }),
    holdKey: vi.fn(),
  };

  const mockMouseAutomation = {
    moveMouse: vi.fn(() => ({ success: true, message: 'Mouse moved' })),
    clickMouse: vi.fn(),
    doubleClick: vi.fn(),
    getCursorPosition: vi.fn(),
    scrollMouse: vi.fn(),
    dragMouse: vi.fn(),
    clickAt: vi.fn(),
  };

  const mockScreenAutomation = {
    getScreenSize: vi.fn(),
    getActiveWindow: vi.fn(),
    focusWindow: vi.fn(),
    resizeWindow: vi.fn(),
    repositionWindow: vi.fn(),
    getScreenshot: vi.fn(),
  };

  const mockClipboardAutomation = {
    getClipboardContent: vi.fn(),
    setClipboardContent: vi.fn(),
    hasClipboardText: vi.fn(),
    clearClipboard: vi.fn(),
  };

  return {
    createAutomationProvider: vi.fn(() => ({
      keyboard: mockKeyboardAutomation,
      mouse: mockMouseAutomation,
      screen: mockScreenAutomation,
      clipboard: mockClipboardAutomation,
    })),
  };
});

// Import for mocking
import { createAutomationProvider } from '../providers/factory.js';

describe('Tools Handler', () => {
  let mockServer: McpServer;
  const registeredTools: Map<string, any> = new Map();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    registeredTools.clear();

    // Create mock server with tool registration capability
    mockServer = {
      tool: vi.fn((name, schema, handler) => {
        registeredTools.set(name, { schema, handler });
        return { name };
      }),
    } as unknown as McpServer;

    // Setup tools with mock server and mock provider
    const mockProvider = vi.mocked(createAutomationProvider)();
    setupTools(mockServer, mockProvider);
  });

  describe('Tool Registration', () => {
    it('should register tools', () => {
      expect(mockServer.tool).toHaveBeenCalled();
      expect(registeredTools.size).toBeGreaterThan(0);
    });

    it('should register all expected tools', () => {
      // Check for essential tools
      expect(registeredTools.has('get_screenshot')).toBe(true);
      expect(registeredTools.has('move_mouse')).toBe(true);
      expect(registeredTools.has('click_mouse')).toBe(true);
      expect(registeredTools.has('type_text')).toBe(true);
      expect(registeredTools.has('press_key')).toBe(true);
      expect(registeredTools.has('get_screen_size')).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    it('should execute move_mouse tool with valid arguments', async () => {
      // Mock is already setup in the mock declaration with default success response
      const mockProvider = vi.mocked(createAutomationProvider)();
      const toolInfo = registeredTools.get('move_mouse');
      
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({ x: 100, y: 200 });

      expect(mockProvider.mouse.moveMouse).toHaveBeenCalledWith({ x: 100, y: 200 });
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Mouse moved',
      });
    });

    it('should execute type_text tool with valid arguments', async () => {
      // Mock is already setup in the mock declaration with default success response
      const mockProvider = vi.mocked(createAutomationProvider)();
      const toolInfo = registeredTools.get('type_text');
      
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({ text: 'Hello World' });

      expect(mockProvider.keyboard.typeText).toHaveBeenCalledWith({ text: 'Hello World' });
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Text typed',
      });
    });

    it('should execute click_mouse tool with default button', async () => {
      const mockProvider = vi.mocked(createAutomationProvider)();
      vi.mocked(mockProvider.mouse.clickMouse).mockReturnValueOnce({
        success: true,
        message: 'Mouse clicked',
      });

      const toolInfo = registeredTools.get('click_mouse');
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({});

      expect(mockProvider.mouse.clickMouse).toHaveBeenCalledWith('left');
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Mouse clicked',
      });
    });

    it('should execute click_mouse tool with specified button', async () => {
      const mockProvider = vi.mocked(createAutomationProvider)();
      vi.mocked(mockProvider.mouse.clickMouse).mockReturnValueOnce({
        success: true,
        message: 'Right mouse clicked',
      });

      const toolInfo = registeredTools.get('click_mouse');
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({ button: 'right' });

      expect(mockProvider.mouse.clickMouse).toHaveBeenCalledWith('right');
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Right mouse clicked',
      });
    });

    it('should execute press_key tool with valid arguments', async () => {
      const mockProvider = vi.mocked(createAutomationProvider)();
      const toolInfo = registeredTools.get('press_key');
      
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({ key: 'enter' });

      expect(mockProvider.keyboard.pressKey).toHaveBeenCalledWith('enter');
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Key pressed',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors', async () => {
      const mockProvider = vi.mocked(createAutomationProvider)();
      vi.mocked(mockProvider.keyboard.pressKey).mockImplementationOnce(() => {
        throw new Error('Key press failed');
      });

      const toolInfo = registeredTools.get('press_key');
      expect(toolInfo).toBeDefined();
      if (!toolInfo) return;

      const result = await toolInfo.handler({ key: 'enter' });

      expect(result.content[0].text).toContain('Key press failed');
    });
  });
});
