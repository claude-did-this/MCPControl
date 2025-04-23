import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { AutomationProvider } from '../interfaces/provider.js';
import {
  MouseButtonSchema,
  MousePositionSchema,
  KeyboardInputSchema,
  KeyCombinationSchema,
  KeyHoldOperationSchema,
  ScrollAmountSchema,
  ClipboardInputSchema,
  ScreenshotOptionsSchema,
} from '../tools/validation.zod.js';
import { z } from 'zod';

/**
 * Set up automation tools on the MCP server using Zod validation.
 * This function implements the provider pattern for all tool handlers, allowing
 * for dependency injection of automation implementations.
 *
 * @param server The Model Context Protocol server instance
 * @param provider The automation provider implementation that will handle system interactions
 */
export function setupTools(server: McpServer, provider: AutomationProvider): void {
  // Define all tools
  const tools = [
      {
        name: 'get_screenshot',
        description:
          'Take a screenshot optimized for AI readability, especially for text-heavy content. Uses default settings: JPEG format, 85% quality, grayscale enabled, and 1280px width (preserving aspect ratio). Supports region capture, format options, quality adjustment, and custom resize settings.',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'X coordinate of the region' },
                y: { type: 'number', description: 'Y coordinate of the region' },
                width: { type: 'number', description: 'Width of the region' },
                height: { type: 'number', description: 'Height of the region' },
              },
              required: ['x', 'y', 'width', 'height'],
              description: 'Specific region to capture (optional)',
            },
            format: {
              type: 'string',
              enum: ['png', 'jpeg'],
              default: 'jpeg',
              description: 'Output format of the screenshot',
            },
            quality: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 85,
              description:
                'JPEG quality (1-100, higher = better quality), only used for JPEG format',
            },
            grayscale: {
              type: 'boolean',
              default: true,
              description: 'Convert to grayscale',
            },
            compressionLevel: {
              type: 'number',
              minimum: 0,
              maximum: 9,
              default: 6,
              description:
                'PNG compression level (0-9, higher = better compression), only used for PNG format',
            },
            resize: {
              type: 'object',
              properties: {
                width: {
                  type: 'number',
                  default: 1280,
                  description: 'Target width',
                },
                height: { type: 'number', description: 'Target height' },
                fit: {
                  type: 'string',
                  enum: ['contain', 'cover', 'fill', 'inside', 'outside'],
                  default: 'contain',
                  description: 'Resize fit option',
                },
              },
              default: { width: 1280, fit: 'contain' },
              description: 'Resize options for the screenshot',
            },
          },
        },
      },
      {
        name: 'click_at',
        description: 'Move mouse to coordinates, click, then return to original position',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate' },
            y: { type: 'number', description: 'Y coordinate' },
            button: {
              type: 'string',
              enum: ['left', 'right', 'middle'],
              default: 'left',
              description: 'Mouse button to click',
            },
          },
          required: ['x', 'y'],
        },
      },
      {
        name: 'move_mouse',
        description: 'Move the mouse cursor to specific coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate' },
            y: { type: 'number', description: 'Y coordinate' },
          },
          required: ['x', 'y'],
        },
      },
      {
        name: 'click_mouse',
        description: 'Click the mouse at the current position',
        inputSchema: {
          type: 'object',
          properties: {
            button: {
              type: 'string',
              enum: ['left', 'right', 'middle'],
              default: 'left',
              description: 'Mouse button to click',
            },
          },
        },
      },
      {
        name: 'drag_mouse',
        description: 'Drag the mouse from one position to another',
        inputSchema: {
          type: 'object',
          properties: {
            fromX: { type: 'number', description: 'Starting X coordinate' },
            fromY: { type: 'number', description: 'Starting Y coordinate' },
            toX: { type: 'number', description: 'Ending X coordinate' },
            toY: { type: 'number', description: 'Ending Y coordinate' },
            button: {
              type: 'string',
              enum: ['left', 'right', 'middle'],
              default: 'left',
              description: 'Mouse button to use for dragging',
            },
          },
          required: ['fromX', 'fromY', 'toX', 'toY'],
        },
      },
      {
        name: 'scroll_mouse',
        description: 'Scroll the mouse wheel up or down',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to scroll (positive for down, negative for up)',
            },
          },
          required: ['amount'],
        },
      },
      {
        name: 'type_text',
        description: 'Type text using the keyboard',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to type' },
          },
          required: ['text'],
        },
      },
      {
        name: 'press_key',
        description: 'Press a specific keyboard key',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: "Key to press (e.g., 'enter', 'tab', 'escape')",
            },
          },
          required: ['key'],
        },
      },
      {
        name: 'hold_key',
        description: 'Hold or release a keyboard key with optional duration',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: "Key to hold/release (e.g., 'shift', 'control')",
            },
            duration: {
              type: 'number',
              description: "Duration to hold the key in milliseconds (only for 'down' state)",
            },
            state: {
              type: 'string',
              enum: ['down', 'up'],
              description: 'Whether to press down or release the key',
            },
          },
          required: ['key', 'state'],
        },
      },
      {
        name: 'press_key_combination',
        description: 'Press multiple keys simultaneously (e.g., keyboard shortcuts)',
        inputSchema: {
          type: 'object',
          properties: {
            keys: {
              type: 'array',
              items: { type: 'string' },
              description: "Array of keys to press simultaneously (e.g., ['control', 'c'])",
            },
          },
          required: ['keys'],
        },
      },
      {
        name: 'get_screen_size',
        description: 'Get the screen dimensions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_cursor_position',
        description: 'Get the current cursor position',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'double_click',
        description: 'Double click at current or specified position',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate (optional)' },
            y: { type: 'number', description: 'Y coordinate (optional)' },
          },
        },
      },
      {
        name: 'get_active_window',
        description: 'Get information about the currently active window',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'focus_window',
        description: 'Focus a specific window by its title',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the window to focus' },
          },
          required: ['title'],
        },
      },
      {
        name: 'resize_window',
        description: 'Resize a specific window by its title',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the window to resize' },
            width: { type: 'number', description: 'New width of the window' },
            height: { type: 'number', description: 'New height of the window' },
          },
          required: ['title', 'width', 'height'],
        },
      },
      {
        name: 'reposition_window',
        description: 'Move a specific window to new coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the window to move' },
            x: { type: 'number', description: 'New X coordinate' },
            y: { type: 'number', description: 'New Y coordinate' },
          },
          required: ['title', 'x', 'y'],
        },
      },
      {
        name: 'minimize_window',
        description: 'Minimize a specific window by its title (currently unsupported)',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the window to minimize' },
          },
          required: ['title'],
        },
      },
      {
        name: 'restore_window',
        description: 'Restore a minimized window by its title (currently unsupported)',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the window to restore' },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_clipboard_content',
        description: 'Get the current text content from the clipboard',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_clipboard_content',
        description: 'Set text content to the clipboard',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to copy to clipboard' },
          },
          required: ['text'],
        },
      },
      {
        name: 'has_clipboard_text',
        description: 'Check if the clipboard contains text',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clear_clipboard',
        description: 'Clear the clipboard content',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
    
  // Helper function to register a tool with zod schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerTool = (toolDefinition: Record<string, unknown>) => {
    const name = toolDefinition.name as string;
    const description = toolDefinition.description as string;
    
    // Using any type here to bypass the TypeScript errors with the SDK
    // This is a temporary workaround until we can properly fix the type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolFn: any = async (args: Record<string, unknown>, _context: unknown) => {
      try {
        let response;

      switch (name) {
        case 'get_screenshot': {
          // Default options for AI-optimized screenshots
          const defaultOptions = {
            format: 'jpeg' as const,
            quality: 85,
            grayscale: true,
            resize: {
              width: 1280,
              fit: 'contain' as const,
            },
          };

          // Parse and validate with Zod
          const screenshotOptions = ScreenshotOptionsSchema.parse({
            ...defaultOptions,
            ...args,
          });

          response = await provider.screen.getScreenshot(screenshotOptions);
          break;
        }

        case 'click_at': {
          // Define Zod schema for click_at arguments
          const clickAtSchema = z.object({
            x: z.number(),
            y: z.number(),
            button: MouseButtonSchema.optional().default('left'),
          });

          const validatedArgs = clickAtSchema.parse(args);

          // Validate position
          MousePositionSchema.parse({
            x: validatedArgs.x,
            y: validatedArgs.y,
          });

          response = provider.mouse.clickAt(validatedArgs.x, validatedArgs.y, validatedArgs.button);
          break;
        }

        case 'move_mouse': {
          const validatedPosition = MousePositionSchema.parse(args);
          response = provider.mouse.moveMouse(validatedPosition);
          break;
        }

        case 'click_mouse': {
          const clickMouseSchema = z.object({
            button: MouseButtonSchema.optional().default('left'),
          });

          const validatedArgs = clickMouseSchema.parse(args || {});
          response = provider.mouse.clickMouse(validatedArgs.button);
          break;
        }

        case 'drag_mouse': {
          const dragMouseSchema = z.object({
            fromX: z.number(),
            fromY: z.number(),
            toX: z.number(),
            toY: z.number(),
            button: MouseButtonSchema.optional().default('left'),
          });

          const validatedArgs = dragMouseSchema.parse(args);

          // Validate positions
          MousePositionSchema.parse({ x: validatedArgs.fromX, y: validatedArgs.fromY });
          MousePositionSchema.parse({ x: validatedArgs.toX, y: validatedArgs.toY });

          response = provider.mouse.dragMouse(
            { x: validatedArgs.fromX, y: validatedArgs.fromY },
            { x: validatedArgs.toX, y: validatedArgs.toY },
            validatedArgs.button,
          );
          break;
        }

        case 'scroll_mouse': {
          const scrollMouseSchema = z.object({
            amount: ScrollAmountSchema,
          });

          const validatedArgs = scrollMouseSchema.parse(args);
          response = provider.mouse.scrollMouse(validatedArgs.amount);
          break;
        }

        case 'type_text': {
          const validatedArgs = KeyboardInputSchema.parse(args);
          response = provider.keyboard.typeText(validatedArgs);
          break;
        }

        case 'press_key': {
          const pressKeySchema = z.object({
            key: z.string(),
          });

          const validatedArgs = pressKeySchema.parse(args);
          const key = validatedArgs.key;

          // Use the KeySchema from validation.zod.ts to validate the key
          const { KeySchema } = await import('../tools/validation.zod.js');
          KeySchema.parse(key);

          response = provider.keyboard.pressKey(key);
          break;
        }

        case 'hold_key': {
          const validatedArgs = KeyHoldOperationSchema.parse(args);
          response = await provider.keyboard.holdKey(validatedArgs);
          break;
        }

        case 'press_key_combination': {
          const validatedArgs = KeyCombinationSchema.parse(args);
          response = await provider.keyboard.pressKeyCombination(validatedArgs);
          break;
        }

        case 'get_screen_size': {
          response = provider.screen.getScreenSize();
          break;
        }

        case 'get_cursor_position': {
          response = provider.mouse.getCursorPosition();
          break;
        }

        case 'double_click': {
          // Define schema for double click
          const doubleClickSchema = z.object({
            x: z.number().optional(),
            y: z.number().optional(),
          });

          const validatedArgs = doubleClickSchema.parse(args || {});

          if (validatedArgs.x !== undefined && validatedArgs.y !== undefined) {
            // Validate position if provided
            const position = { x: validatedArgs.x, y: validatedArgs.y };
            MousePositionSchema.parse(position);
            response = provider.mouse.doubleClick(position);
          } else {
            response = provider.mouse.doubleClick();
          }
          break;
        }

        case 'get_active_window': {
          response = provider.screen.getActiveWindow();
          break;
        }

        case 'focus_window': {
          const focusWindowSchema = z.object({
            title: z.string().min(1),
          });

          const validatedArgs = focusWindowSchema.parse(args);
          response = provider.screen.focusWindow(validatedArgs.title);
          break;
        }

        case 'resize_window': {
          const resizeWindowSchema = z.object({
            title: z.string().min(1),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          });

          const validatedArgs = resizeWindowSchema.parse(args);
          response = provider.screen.resizeWindow(
            validatedArgs.title,
            validatedArgs.width,
            validatedArgs.height,
          );
          break;
        }

        case 'reposition_window': {
          const repositionWindowSchema = z.object({
            title: z.string().min(1),
            x: z.number().int(),
            y: z.number().int(),
          });

          const validatedArgs = repositionWindowSchema.parse(args);
          response = provider.screen.repositionWindow(
            validatedArgs.title,
            validatedArgs.x,
            validatedArgs.y,
          );
          break;
        }

        case 'minimize_window': {
          const minimizeWindowSchema = z.object({
            title: z.string().min(1),
          });

          // Just validate but don't use the result as this operation is not supported
          minimizeWindowSchema.parse(args);
          response = { success: false, message: 'Minimize window operation is not supported' };
          break;
        }

        case 'restore_window': {
          const restoreWindowSchema = z.object({
            title: z.string().min(1),
          });

          // Just validate but don't use the result as this operation is not supported
          restoreWindowSchema.parse(args);
          response = { success: false, message: 'Restore window operation is not supported' };
          break;
        }

        case 'get_clipboard_content': {
          response = await provider.clipboard.getClipboardContent();
          break;
        }

        case 'set_clipboard_content': {
          const validatedArgs = ClipboardInputSchema.parse(args);
          response = await provider.clipboard.setClipboardContent(validatedArgs);
          break;
        }

        case 'has_clipboard_text': {
          response = await provider.clipboard.hasClipboardText();
          break;
        }

        case 'clear_clipboard': {
          response = await provider.clipboard.clearClipboard();
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // Handle special case for screenshot which returns content with image data
      const typedResponse = response;
      if (
        'content' in typedResponse &&
        typedResponse.content &&
        Array.isArray(typedResponse.content) &&
        typedResponse.content.length > 0 &&
        typedResponse.content[0] &&
        typeof typedResponse.content[0] === 'object' &&
        'type' in typedResponse.content[0] &&
        typedResponse.content[0].type === 'image'
      ) {
        return {
          content: typedResponse.content,
        };
      }

      // For all other responses, return as text
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      // Enhanced error handling for Zod validation errors
      let errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a Zod error to provide more helpful validation messages
      if (error && typeof error === 'object' && 'errors' in error) {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          // Fall back to standard message if error can't be stringified
        }
      }

      const errorContent: TextContent = {
        type: 'text',
        text: `Error: ${errorMessage}`,
      };

      return {
        content: [errorContent],
      };
    }
    };
    
    // Register the tool
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    server.tool(name, description, toolFn);
  };
  
  // Register each tool
  for (const toolDefinition of tools) {
    registerTool(toolDefinition);
  }
}
