import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getScreenshot } from "../tools/screen.js";
import { getCursorPosition } from "../tools/mouse.js";

export function setupResources(server: Server): void {
  // Handle resources/list request
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
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
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "screen://current": {
        const response = await getScreenshot();
        if (!response.success || !response.screenshot) {
          throw new Error(response.message);
        }
        
        return {
          contents: [{
            uri,
            mimeType: "image/png",
            blob: response.screenshot
          }]
        };
      }

      case "cursor://position": {
        const response = await getCursorPosition();
        if (!response.success || !response.data) {
          throw new Error(response.message);
        }

        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(response.data, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
