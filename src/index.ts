#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTools } from "./handlers/tools.js";
import { setupToolsLegacy } from "./handlers/tools.js";
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
  
  /**
   * Flag indicating whether to use legacy validation instead of Zod validation
   * Set via the --legacy-validation command line argument
   */
  private useLegacyValidation: boolean;

  constructor() {
    try {
      // Parse command line arguments
      const args = process.argv.slice(2);
      const useLegacy = args.includes('--legacy-validation');
      
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
        version: "0.1.17"
      }, {
        capabilities: {
          tools: {}
        }
      });
      
      // Flag to determine whether to use legacy validation
      this.useLegacyValidation = useLegacy;

      this.setupHandlers();
      this.setupErrorHandling();
    } catch (error) {
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(`Failed to initialize MCP Control Server: ${error instanceof Error ? error.message : String(error)}\n`);
      // Log additional shutdown information
      process.stderr.write('Server initialization failed. Application will now exit.\n');
      // Exit with non-zero status to indicate error
      process.exit(1);
    }
  }

  private setupHandlers(): void {
    // Choose the appropriate setup function based on the --legacy-validation flag
    if (this.useLegacyValidation) {
      // Use original validation when legacy mode is requested
      setupToolsLegacy(this.server, this.provider);
      process.stderr.write(`Using legacy validation for MCP tools\n`);
    } else {
      // Use enhanced Zod validation by default
      setupTools(this.server, this.provider);
      process.stderr.write(`Using enhanced Zod validation for MCP tools\n`);
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      // Using process.stderr.write to avoid affecting the JSON-RPC stream
      process.stderr.write(`[MCP Error] ${error instanceof Error ? error.message : String(error)}\n`);
    };

    process.on('SIGINT', () => {
      void this.server.close().then(() => process.exit(0));
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Using process.stderr.write to avoid affecting the JSON-RPC stream
    process.stderr.write(`MCP Control server running on stdio (using ${this.provider.constructor.name})\n`);
  }
}

const server = new MCPControlServer();
server.run().catch(err => {
  // Using process.stderr.write to avoid affecting the JSON-RPC stream
  process.stderr.write(`Error starting server: ${err instanceof Error ? err.message : String(err)}\n`);
});