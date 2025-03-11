import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupTools } from './tools.js';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ImageContent } from "@modelcontextprotocol/sdk/types.js";

// Mock all tool modules
vi.mock('../tools/mouse.js', () => ({
  moveMouse: vi.fn(),
  clickMouse: vi.fn(),
  doubleClick: vi.fn(),
  getCursorPosition: vi.fn(),
  scrollMouse: vi.fn(),
  dragMouse: vi.fn(),
  setMouseSpeed: vi.fn()
}));

vi.mock('../tools/keyboard.js', () => ({
  typeText: vi.fn(),
  pressKey: vi.fn(),
  pressKeyCombination: vi.fn().mockResolvedValue({
    success: true,
    message: 'Pressed key combination: control+c'
  }),
  holdKey: vi.fn()
}));

vi.mock('../tools/screen.js', () => ({
  getScreenSize: vi.fn(),
  getScreenshot: vi.fn(),
  getActiveWindow: vi.fn(),
  listAllWindows: vi.fn(),
  focusWindow: vi.fn(),
  resizeWindow: vi.fn(),
  repositionWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  restoreWindow: vi.fn()
}));

vi.mock('../tools/clipboard.js', () => ({
  getClipboardContent: vi.fn(),
  setClipboardContent: vi.fn(),
  hasClipboardText: vi.fn(),
  clearClipboard: vi.fn()
}));

// Import mocked functions for testing
import { moveMouse, clickMouse } from '../tools/mouse.js';
import { typeText, pressKey } from '../tools/keyboard.js';
import { getScreenSize, getScreenshot } from '../tools/screen.js';
import { getClipboardContent, setClipboardContent } from '../tools/clipboard.js';

describe('Tools Handler', () => {
  let mockServer: Server;
  let listToolsHandler: Function;
  let callToolHandler: Function;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock server with handler setters
    mockServer = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === ListToolsRequestSchema) {
          listToolsHandler = handler;
        } else if (schema === CallToolRequestSchema) {
          callToolHandler = handler;
        }
      })
    } as unknown as Server;

    // Setup tools with mock server
    setupTools(mockServer);
  });

  describe('Tool Registration', () => {
    it('should register both request handlers', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(ListToolsRequestSchema, expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(CallToolRequestSchema, expect.any(Function));
    });

    it('should return list of available tools', async () => {
      const result = await listToolsHandler();
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.tools[0]).toHaveProperty('name');
      expect(result.tools[0]).toHaveProperty('description');
      expect(result.tools[0]).toHaveProperty('inputSchema');
    });
  });

  describe('Tool Execution', () => {
    it('should execute move_mouse tool with valid arguments', async () => {
      vi.mocked(moveMouse).mockResolvedValue({ success: true, message: 'Mouse moved' });

      const result = await callToolHandler({
        params: {
          name: 'move_mouse',
          arguments: { x: 100, y: 200 }
        }
      });

      expect(moveMouse).toHaveBeenCalledWith({ x: 100, y: 200 });
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Mouse moved'
      });
    });

    it('should execute type_text tool with valid arguments', async () => {
      vi.mocked(typeText).mockResolvedValue({ success: true, message: 'Text typed' });

      const result = await callToolHandler({
        params: {
          name: 'type_text',
          arguments: { text: 'Hello World' }
        }
      });

      expect(typeText).toHaveBeenCalledWith({ text: 'Hello World' });
      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        message: 'Text typed'
      });
    });

    it('should handle screenshot tool with VS Code format', async () => {
      const mockImageContent: ImageContent[] = [{
        type: "image",
        data: 'base64-image-data',
        mimeType: 'image/png'
      }];

      vi.mocked(getScreenshot).mockResolvedValue({
        success: true,
        message: 'Screenshot taken',
        content: mockImageContent
      });

      const result = await callToolHandler({
        params: {
          name: 'get_screenshot',
          arguments: { format: 'png' }
        }
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        success: true,
        message: 'Screenshot captured successfully',
        screenshot: 'base64-image-data',
        timestamp: expect.any(String)
      });
      expect(new Date(parsedContent.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tool name', async () => {
      const result = await callToolHandler({
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should handle invalid arguments', async () => {
      const result = await callToolHandler({
        params: {
          name: 'move_mouse',
          arguments: { invalid: 'args' }
        }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid mouse position arguments');
    });

    it('should handle tool execution errors', async () => {
      vi.mocked(pressKey).mockRejectedValue(new Error('Key press failed'));

      const result = await callToolHandler({
        params: {
          name: 'press_key',
          arguments: { key: 'enter' }
        }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Key press failed');
    });
  });

  describe('Type Validation', () => {
    it('should validate mouse position arguments', async () => {
      vi.mocked(moveMouse).mockResolvedValue({ success: true, message: 'Mouse moved' });

      const validResult = await callToolHandler({
        params: {
          name: 'move_mouse',
          arguments: { x: 100, y: 200 }
        }
      });
      expect(JSON.parse(validResult.content[0].text)).toHaveProperty('success');

      const invalidResult = await callToolHandler({
        params: {
          name: 'move_mouse',
          arguments: { x: 'invalid', y: 200 }
        }
      });
      expect(invalidResult.isError).toBe(true);
    });

    it('should validate keyboard input arguments', async () => {
      vi.mocked(typeText).mockResolvedValue({ success: true, message: 'Text typed' });

      const validResult = await callToolHandler({
        params: {
          name: 'type_text',
          arguments: { text: 'Hello' }
        }
      });
      expect(JSON.parse(validResult.content[0].text)).toHaveProperty('success');

      const invalidResult = await callToolHandler({
        params: {
          name: 'type_text',
          arguments: { text: 123 }
        }
      });
      expect(invalidResult.isError).toBe(true);
    });

    it('should validate key combination arguments', async () => {
      const validResult = await callToolHandler({
        params: {
          name: 'press_key_combination',
          arguments: { keys: ['control', 'c'] }
        }
      });
      expect(JSON.parse(validResult.content[0].text)).toEqual({
        success: true,
        message: 'Pressed key combination: control+c'
      });

      const invalidResult = await callToolHandler({
        params: {
          name: 'press_key_combination',
          arguments: { keys: 'invalid' }
        }
      });
      expect(invalidResult.isError).toBe(true);
    });
  });
});
