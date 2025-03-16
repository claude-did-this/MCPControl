import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTools } from "./handlers/tools.js";
import { loadConfig } from "./config.js";
import { createAutomationProvider } from "./providers/factory.js";
import { AutomationProvider } from "./interfaces/provider.js";

class WindowsControlServer {
  private server: Server;
  private provider: AutomationProvider;

  constructor() {
    // Load configuration
    const config = loadConfig();
    
    // Create automation provider based on configuration
    this.provider = createAutomationProvider(config.provider);
    
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
  }

  private setupHandlers(): void {
    // Pass the provider to setupTools
    setupTools(this.server);
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
    console.error(`Windows Control MCP server running on stdio (using ${this.provider.constructor.name})`);
  }
}

const server = new WindowsControlServer();
server.run().catch(console.error);
