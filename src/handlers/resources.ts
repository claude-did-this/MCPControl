import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getScreenshot, getScreenSize, getActiveWindow, listAllWindows } from "../tools/screen.js";
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
        uri: "screen://size",
        name: "Screen Size",
        description: "The current screen dimensions",
        mimeType: "application/json"
      },
      {
        uri: "cursor://position",
        name: "Cursor Position",
        description: "Current cursor coordinates",
        mimeType: "application/json"
      },
      {
        uri: "window://active",
        name: "Active Window",
        description: "Information about the currently active window",
        mimeType: "application/json"
      },
      {
        uri: "window://list",
        name: "Window List",
        description: "List of all visible windows",
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
        if (!response.success || !response.content) {
          throw new Error(response.message);
        }
        
        return {
          contents: [{
            uri,
            mimeType: "image/png",
            blob: response.content[0].data
          }]
        };
      }

      case "screen://size": {
        const response = await getScreenSize();
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

      case "window://active": {
        const response = await getActiveWindow();
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

      case "window://list": {
        const response = await listAllWindows();
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
