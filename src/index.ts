import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupTools } from "./handlers/tools.js";

class WindowsControlServer {
  private server: Server;

  constructor() {
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
    console.error("Windows Control MCP server running on stdio");
  }
}

const server = new WindowsControlServer();
server.run().catch(console.error);
