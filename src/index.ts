import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  TextContent,
  ImageContent
} from "@modelcontextprotocol/sdk/types.js";
import libnut from '@nut-tree/libnut';
import sharp from 'sharp';
import type { 
  MousePosition, 
  KeyboardInput, 
  WindowsControlResponse,
  WindowInfo
} from "./types.js";

// Type for mouse button mapping
type ButtonMap = {
  [key: string]: number;
  left: number;
  right: number;
  middle: number;
};

class WindowsControlServer {
  private server: Server;
  private buttonMap: ButtonMap = {
    'left': 0,
    'right': 1,
    'middle': 2
  };

  constructor() {
    this.server = new Server({
      name: "windows-control",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    this.setupTools();
    this.setupResources();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResources(): void {
    // Handle resources/list request
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "screen://current",
          name: "Current Screen",
          description: "The current screen display",
          mimeType: "image/png"
        },
        {
          uri: "cursor://position",
          name: "Cursor Position",
          description: "Current cursor coordinates",
          mimeType: "application/json"
        }
      ]
    }));

    // Handle resources/read request
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case "screen://current": {
          const screen = libnut.screen.capture();
          
          // Convert BGRA to RGBA
          const rgbaBuffer = Buffer.alloc(screen.image.length);
          for (let i = 0; i < screen.image.length; i += 4) {
            rgbaBuffer[i] = screen.image[i + 2];     // R (from B)
            rgbaBuffer[i + 1] = screen.image[i + 1]; // G (unchanged)
            rgbaBuffer[i + 2] = screen.image[i];     // B (from R)
            rgbaBuffer[i + 3] = screen.image[i + 3]; // A (unchanged)
          }

          // Convert to PNG and get base64
          const pngBuffer = await sharp(rgbaBuffer, {
            raw: {
              width: screen.width,
              height: screen.height,
              channels: 4
            }
          })
          .png()
          .toBuffer();

          return {
            contents: [{
              uri,
              mimeType: "image/png",
              blob: pngBuffer.toString('base64')
            }]
          };
        }

        case "cursor://position": {
          const position = libnut.getMousePos();
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                x: position.x,
                y: position.y
              }, null, 2)
            }]
          };
        }

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        let response: WindowsControlResponse;

        switch (name) {
          case "move_mouse":
            if (!this.isMousePosition(args)) {
              throw new Error("Invalid mouse position arguments");
            }
            response = await this.moveMouse(args);
            break;

          case "click_mouse":
            response = await this.clickMouse(
              typeof args?.button === 'string' ? args.button : 'left'
            );
            break;

          case "type_text":
            if (!this.isKeyboardInput(args)) {
              throw new Error("Invalid keyboard input arguments");
            }
            response = await this.typeText(args);
            break;

          case "press_key":
            if (typeof args?.key !== 'string') {
              throw new Error("Invalid key press arguments");
            }
            response = await this.pressKey(args.key);
            break;

          case "get_screen_size":
            response = await this.getScreenSize();
            break;

          case "get_screenshot":
            const region = args?.region as { x: number; y: number; width: number; height: number; } | undefined;
            response = await this.getScreenshot(region);
            break;

          case "get_cursor_position":
            response = await this.getCursorPosition();
            break;

          case "double_click":
            if (args && typeof args.x === 'number' && typeof args.y === 'number') {
              response = await this.doubleClick({ x: args.x, y: args.y });
            } else {
              response = await this.doubleClick();
            }
            break;

          case "get_active_window":
            response = await this.getActiveWindow();
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

  private isMousePosition(args: unknown): args is MousePosition {
    if (typeof args !== 'object' || args === null) return false;
    const pos = args as Record<string, unknown>;
    return typeof pos.x === 'number' && typeof pos.y === 'number';
  }

  private isKeyboardInput(args: unknown): args is KeyboardInput {
    if (typeof args !== 'object' || args === null) return false;
    const input = args as Record<string, unknown>;
    return typeof input.text === 'string';
  }

  private async moveMouse(position: MousePosition): Promise<WindowsControlResponse> {
    try {
      await libnut.moveMouse(position.x, position.y);
      return {
        success: true,
        message: `Mouse moved to position (${position.x}, ${position.y})`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to move mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async clickMouse(button: string = 'left'): Promise<WindowsControlResponse> {
    try {
      const buttonCode = this.buttonMap[button.toLowerCase()];
      if (buttonCode === undefined) {
        throw new Error(`Invalid mouse button: ${button}`);
      }
      await libnut.mouseClick(String(buttonCode));
      return {
        success: true,
        message: `Clicked ${button} mouse button`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to click mouse: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async typeText(input: KeyboardInput): Promise<WindowsControlResponse> {
    try {
      await libnut.typeString(input.text);
      return {
        success: true,
        message: `Typed text successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async pressKey(key: string): Promise<WindowsControlResponse> {
    try {
      await libnut.keyTap(key);
      return {
        success: true,
        message: `Pressed key: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async getScreenSize(): Promise<WindowsControlResponse> {
    try {
      const screen = libnut.screen.capture();
      return {
        success: true,
        message: "Screen size retrieved successfully",
        data: {
          width: screen.width,
          height: screen.height
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get screen size: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async getScreenshot(region?: { x: number; y: number; width: number; height: number; }): Promise<WindowsControlResponse> {
    try {
      const screen = region ? 
        libnut.screen.capture(region.x, region.y, region.width, region.height) :
        libnut.screen.capture();

      // Convert BGRA to RGBA
      const rgbaBuffer = Buffer.alloc(screen.image.length);
      for (let i = 0; i < screen.image.length; i += 4) {
        rgbaBuffer[i] = screen.image[i + 2];     // R (from B)
        rgbaBuffer[i + 1] = screen.image[i + 1]; // G (unchanged)
        rgbaBuffer[i + 2] = screen.image[i];     // B (from R)
        rgbaBuffer[i + 3] = screen.image[i + 3]; // A (unchanged)
      }

      // Convert to PNG and get base64
      const pngBuffer = await sharp(rgbaBuffer, {
        raw: {
          width: screen.width,
          height: screen.height,
          channels: 4
        }
      })
      .png()
      .toBuffer();

      const base64Data = pngBuffer.toString('base64');

      return {
        success: true,
        message: "Screenshot captured successfully",
        screenshot: base64Data
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async getCursorPosition(): Promise<WindowsControlResponse> {
    try {
      const position = libnut.getMousePos();
      return {
        success: true,
        message: "Cursor position retrieved successfully",
        data: {
          x: position.x,
          y: position.y
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get cursor position: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async doubleClick(position?: MousePosition): Promise<WindowsControlResponse> {
    try {
      if (position) {
        await libnut.moveMouse(position.x, position.y);
      }
      await libnut.mouseClick("0"); // First click
      await libnut.mouseClick("0"); // Second click
      return {
        success: true,
        message: position ? 
          `Double clicked at position (${position.x}, ${position.y})` : 
          "Double clicked at current position"
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to double click: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async getActiveWindow(): Promise<WindowsControlResponse> {
    try {
      // Get the active window handle
      const handle = await libnut.getActiveWindow();
      
      // Get window region (position and size)
      const region = await libnut.screen.capture();
      
      const windowInfo: WindowInfo = {
        title: "Active Window", // Currently libnut doesn't provide a way to get window title
        position: {
          x: 0, // Currently libnut doesn't provide a way to get window position
          y: 0
        },
        size: {
          width: region.width,
          height: region.height
        }
      };

      return {
        success: true,
        message: "Active window information retrieved successfully",
        data: windowInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active window information: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Windows Control MCP server running on stdio");
  }
}

const server = new WindowsControlServer();
server.run().catch(console.error);
