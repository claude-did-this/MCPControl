```
● Based on my exploration of the codebase and the keysender library, I'll outline a refactoring plan to implement dependency injection for OS automation libraries.
  Refactoring Plan for Dependency Injection

  1. Create Automation Interface Layer

  First, we'll need to define abstract interfaces for each automation capability:

  // src/interfaces/automation.ts
  export interface KeyboardAutomation {
    typeText(text: string): Promise<WindowsControlResponse>;
    pressKey(key: string): Promise<WindowsControlResponse>;
    pressKeyCombination(keys: string[]): Promise<WindowsControlResponse>;
    holdKey(key: string, state: 'down' | 'up', duration?: number): Promise<WindowsControlResponse>;
  }

  export interface MouseAutomation {
    moveMouse(x: number, y: number): Promise<WindowsControlResponse>;
    clickMouse(button?: 'left' | 'right' | 'middle'): Promise<WindowsControlResponse>;
    doubleClick(x?: number, y?: number): Promise<WindowsControlResponse>;
    getCursorPosition(): Promise<WindowsControlResponse>;
    scrollMouse(amount: number): Promise<WindowsControlResponse>;
    dragMouse(fromX: number, fromY: number, toX: number, toY: number, button?: 'left' | 'right' | 'middle'): Promise<WindowsControlResponse>;
    clickAt(x: number, y: number, button?: 'left' | 'right' | 'middle'): Promise<WindowsControlResponse>;
    setMouseSpeed(speed: number): Promise<WindowsControlResponse>;
  }

  export interface ScreenAutomation {
    getScreenSize(): Promise<WindowsControlResponse>;
    getActiveWindow(): Promise<WindowsControlResponse>;
    focusWindow(title: string): Promise<WindowsControlResponse>;
    resizeWindow(title: string, width: number, height: number): Promise<WindowsControlResponse>;
    repositionWindow(title: string, x: number, y: number): Promise<WindowsControlResponse>;
    getScreenshot(options?: ScreenshotOptions): Promise<WindowsControlResponse>;
  }

  export interface ClipboardAutomation {
    getClipboardContent(): Promise<WindowsControlResponse>;
    setClipboardContent(text: string): Promise<WindowsControlResponse>;
    hasClipboardText(): Promise<WindowsControlResponse>;
    clearClipboard(): Promise<WindowsControlResponse>;
  }

  2. Create Automation Provider Interface

  // src/interfaces/provider.ts
  export interface AutomationProvider {
    keyboard: KeyboardAutomation;
    mouse: MouseAutomation;
    screen: ScreenAutomation;
    clipboard: ClipboardAutomation;
  }

  3. Implement NutJS Provider

  // src/providers/nutjs/index.ts
  export class NutJSProvider implements AutomationProvider {
    keyboard: KeyboardAutomation;
    mouse: MouseAutomation;
    screen: ScreenAutomation;
    clipboard: ClipboardAutomation;

    constructor() {
      this.keyboard = new NutJSKeyboardAutomation();
      this.mouse = new NutJSMouseAutomation();
      this.screen = new NutJSScreenAutomation();
      this.clipboard = new NutJSClipboardAutomation();
    }
  }

  // Implementation classes for each automation interface using libnut

  4. Implement Keysender Provider for Windows

  // src/providers/keysender/index.ts
  export class KeysenderProvider implements AutomationProvider {
    keyboard: KeyboardAutomation;
    mouse: MouseAutomation;
    screen: ScreenAutomation;
    clipboard: ClipboardAutomation;

    constructor() {
      this.keyboard = new KeysenderKeyboardAutomation();
      this.mouse = new KeysenderMouseAutomation();
      this.screen = new KeysenderScreenAutomation();
      // Could use same clipboard implementation or a different one
      this.clipboard = new ClipboardyAutomation();
    }
  }

  // Implementation classes for each automation interface using keysender

  5. Create Provider Factory

  // src/providers/factory.ts
  export function createAutomationProvider(type: 'nutjs' | 'keysender' | string): AutomationProvider {
    switch (type) {
      case 'nutjs':
        return new NutJSProvider();
      case 'keysender':
        return new KeysenderProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  6. Refactor Server to Use Dependency Injection

  // src/index.ts
  import { Server } from "@modelcontextprotocol/sdk/server/index.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  import { setupTools } from "./handlers/tools.js";
  import { createAutomationProvider } from "./providers/factory.js";
  import { AutomationProvider } from "./interfaces/provider.js";

  class WindowsControlServer {
    private server: Server;
    private automationProvider: AutomationProvider;

    constructor(providerType: string = 'nutjs') {
      this.server = new Server({
        name: "windows-control",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Create the provider
      this.automationProvider = createAutomationProvider(providerType);

      // Pass provider to handlers
      this.setupHandlers();
      this.setupErrorHandling();
    }

    private setupHandlers(): void {
      setupTools(this.server, this.automationProvider);
    }

    // Rest of the class remains the same
  }

  // Get provider type from environment or config
  const providerType = process.env.AUTOMATION_PROVIDER || 'nutjs';
  const server = new WindowsControlServer(providerType);
  server.run().catch(console.error);

  7. Refactor Tool Handlers to Use the Provider

  // src/handlers/tools.ts
  export function setupTools(server: Server, provider: AutomationProvider): void {
    // Register tool handlers as before, but use provider instead of direct imports

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Example for keyboard-related tools:
      switch(name) {
        case "type_text":
          return await provider.keyboard.typeText(args.text);

        case "press_key":
          return await provider.keyboard.pressKey(args.key);

        // Other handlers mapped to provider methods...
      }
    });
  }

  8. Configuration System

  // src/config.ts
  interface AutomationConfig {
    provider: string;
    // Other configuration options
  }

  export function loadConfig(): AutomationConfig {
    // Load from environment variables, config file, etc.
    return {
      provider: process.env.AUTOMATION_PROVIDER || 'nutjs'
    };
  }
```
