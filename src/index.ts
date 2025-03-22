import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTools } from "./handlers/tools.js";
import { loadConfig } from "./config.js";
import { createAutomationProvider } from "./providers/factory.js";
import { AutomationProvider } from "./interfaces/provider.js";

class WindowsControlServer {
  private server!: Server;
  
  /** 
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider!: AutomationProvider;
  private initialized = false;

  constructor() {
    // Don't call initialize in constructor - we'll wait for explicit initialization
  }
  
  /**
   * Initialize the server and provider
   * This must be called and awaited before running the server
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load configuration
      const config = loadConfig();
      
      // Create automation provider based on configuration
      // The factory now handles platform-specific defaults if provider is undefined
      this.provider = await createAutomationProvider(config.provider);
      
      this.server = new Server({
        name: "windows-control",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      this.setupHandlers();
      this.setupErrorHandling();
      this.initialized = true;
    } catch (error) {
      console.error(`Failed to initialize Windows Control Server: ${error instanceof Error ? error.message : String(error)}`);
      // Log additional shutdown information
      console.error('Server initialization failed. Application will now exit.');
      // Exit with non-zero status to indicate error
      process.exit(1);
    }
  }

  private setupHandlers(): void {
    // Pass the provider to setupTools
    setupTools(this.server, this.provider);
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', () => {
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Server must be initialized before running. Call initialize() first.');
    }
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`Windows Control MCP server running on stdio (using ${this.provider.constructor.name})`);
  }
}

// Create server instance
const server = new WindowsControlServer();

// Initialize and run the server
async function startServer() {
  try {
    await server.initialize();
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
void startServer();