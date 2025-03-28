#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTools } from "./handlers/tools.js";
import { loadConfig } from "./config.js";
import { createAutomationProvider } from "./providers/factory.js";
import { AutomationProvider } from "./interfaces/provider.js";

class MCPControlServer {
  private server: Server;
  
  /** 
   * Automation provider instance used for system interaction
   * The provider implements keyboard, mouse, screen, and clipboard functionality
   * through a consistent interface allowing for different backend implementations
   */
  private provider: AutomationProvider;

  constructor() {
    try {
      // Load configuration
      const config = loadConfig();
      
      // Validate configuration
      if (!config || typeof config.provider !== 'string') {
        throw new Error('Invalid configuration: provider property is missing or invalid');
      }
      
      // Validate that the provider is supported
      const supportedProviders = ['keysender']; // add others as they become available
      if (!supportedProviders.includes(config.provider.toLowerCase())) {
        throw new Error(`Unsupported provider: ${config.provider}. Supported providers: ${supportedProviders.join(', ')}`);
      }
      
      // Create automation provider based on configuration
      this.provider = createAutomationProvider(config.provider);
      
      this.server = new Server({
        name: "mcp-control",
        version: "0.1.1"
      }, {
        capabilities: {
          tools: {}
        }
      });

      this.setupHandlers();
      this.setupErrorHandling();
    } catch (error) {
      console.error(`Failed to initialize MCP Control Server: ${error instanceof Error ? error.message : String(error)}`);
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP Control server running on stdio (using ${this.provider.constructor.name})`);
  }
}

const server = new MCPControlServer();
server.run().catch(console.error);
