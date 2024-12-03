import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  TextContent
} from "@modelcontextprotocol/sdk/types.js";
import { MousePosition, KeyboardInput } from "../types/common.js";
import { 
  moveMouse, 
  clickMouse, 
  doubleClick, 
  getCursorPosition,
  scrollMouse
} from "../tools/mouse.js";
import { 
  typeText, 
  pressKey 
} from "../tools/keyboard.js";
import { 
  getScreenSize, 
  getScreenshot, 
  getActiveWindow 
} from "../tools/screen.js";

export function setupTools(server: Server): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "move_mouse",
        description: "Move the mouse cursor to specific coordinates",
        inputSchema: {
          type: "object",
          properties: {
            x: { type: "number", description: "X coordinate" },
            y: { type: "number", description: "Y coordinate" }
          },
          required: ["x", "y"]
        }
      },
      {
        name: "click_mouse",
        description: "Click the mouse at the current position",
        inputSchema: {
          type: "object",
          properties: {
            button: { 
              type: "string", 
              enum: ["left", "right", "middle"],
              default: "left",
              description: "Mouse button to click" 
            }
          }
        }
      },
      {
        name: "scroll_mouse",
        description: "Scroll the mouse wheel up or down",
        inputSchema: {
          type: "object",
          properties: {
            amount: { 
              type: "number", 
              description: "Amount to scroll (positive for down, negative for up)" 
            }
          },
          required: ["amount"]
        }
      },
      {
        name: "type_text",
        description: "Type text using the keyboard",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to type" }
          },
          required: ["text"]
        }
      },
      {
        name: "press_key",
        description: "Press a specific keyboard key",
        inputSchema: {
          type: "object",
          properties: {
            key: { 
              type: "string",
              description: "Key to press (e.g., 'enter', 'tab', 'escape')" 
            }
          },
          required: ["key"]
        }
      },
      {
        name: "get_screen_size",
        description: "Get the screen dimensions",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_screenshot",
        description: "Take a screenshot of the current screen",
        inputSchema: {
          type: "object",
          properties: {
            region: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          }
        }
      },
      {
        name: "get_cursor_position",
        description: "Get the current cursor position",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "double_click",
        description: "Double click at current or specified position",
        inputSchema: {
          type: "object",
          properties: {
            x: { type: "number", description: "X coordinate (optional)" },
            y: { type: "number", description: "Y coordinate (optional)" }
          }
        }
      },
      {
        name: "get_active_window",
        description: "Get information about the currently active window",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      let response;

      switch (name) {
        case "move_mouse":
          if (!isMousePosition(args)) {
            throw new Error("Invalid mouse position arguments");
          }
          response = await moveMouse(args);
          break;

        case "click_mouse":
          response = await clickMouse(
            typeof args?.button === 'string' ? args.button : 'left'
          );
          break;

        case "scroll_mouse":
          if (typeof args?.amount !== 'number') {
            throw new Error("Invalid scroll amount argument");
          }
          response = await scrollMouse(args.amount);
          break;

        case "type_text":
          if (!isKeyboardInput(args)) {
            throw new Error("Invalid keyboard input arguments");
          }
          response = await typeText(args);
          break;

        case "press_key":
          if (typeof args?.key !== 'string') {
            throw new Error("Invalid key press arguments");
          }
          response = await pressKey(args.key);
          break;

        case "get_screen_size":
          response = await getScreenSize();
          break;

        case "get_screenshot":
          const region = args?.region as { x: number; y: number; width: number; height: number; } | undefined;
          response = await getScreenshot(region);
          break;

        case "get_cursor_position":
          response = await getCursorPosition();
          break;

        case "double_click":
          if (args && typeof args.x === 'number' && typeof args.y === 'number') {
            response = await doubleClick({ x: args.x, y: args.y });
          } else {
            response = await doubleClick();
          }
          break;

        case "get_active_window":
          response = await getActiveWindow();
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      const errorContent: TextContent = {
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      };

      return {
        content: [errorContent],
        isError: true
      };
    }
  });
}

function isMousePosition(args: unknown): args is MousePosition {
  if (typeof args !== 'object' || args === null) return false;
  const pos = args as Record<string, unknown>;
  return typeof pos.x === 'number' && typeof pos.y === 'number';
}

function isKeyboardInput(args: unknown): args is KeyboardInput {
  if (typeof args !== 'object' || args === null) return false;
  const input = args as Record<string, unknown>;
  return typeof input.text === 'string';
}
