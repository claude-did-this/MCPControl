# MCP Protocol 1.10.2 Server Implementation Guide with Streaming HTTP Support

> **IMPORTANT NOTE**: This document contains implementation details based on MCP SDK 1.10.2. The actual class name is `StreamableHTTPServerTransport` (not HttpStreamServerTransport), found in `@modelcontextprotocol/sdk/server/streamableHttp.js`.

## Introduction

The Model Context Protocol (MCP) is an open standard that enables standardized communication between AI applications and external tools/data sources. MCP was introduced by Anthropic as a "USB for AI integrations" to standardize how AI applications connect with external tools, data sources, and systems. Version 1.10.2 includes significant improvements to the transport layer, particularly the Streaming HTTP protocol.

## MCP Architecture Overview

MCP follows a client-server architecture:

1. MCP Clients: Protocol clients that maintain 1:1 connections with servers
2. MCP Servers: Lightweight programs that expose specific capabilities through the standardized Model Context Protocol
3. Local Data Sources: Your computer's files, databases, and services that MCP servers can securely access
4. Remote Services: External systems available over the internet (e.g., through APIs) that MCP servers can connect to

## Streaming HTTP Transport in MCP 1.10.2

The MCP 1.10.2 specification introduced the Streamable HTTP transport to replace the previous HTTP+SSE transport. This new transport layer offers several advantages:

The HTTP Stream Transport provides a modern, flexible transport layer that supports both batch responses and streaming via Server-Sent Events (SSE). It offers advanced features like session management, resumable streams, and comprehensive authentication options.

Key features include:
- Single endpoint for all MCP communication
- Multiple response modes (batch and streaming)
- Built-in session management
- Support for resuming broken connections
- Comprehensive authentication support
- Flexible CORS configuration

## Implementing an MCP Server with TypeScript SDK 1.10.2

Let's implement an MCP server for controlling the computer (similar to MCPControl) using the TypeScript SDK version 1.10.2.

### Setup

1. Create a new TypeScript project:

```bash
mkdir mcp-control-server
cd mcp-control-server
npm init -y
npm install @modelcontextprotocol/sdk@1.10.2 zod
npm install -D typescript @types/node
```

2. Configure TypeScript (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "build",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

3. Update `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('build/index.js', '755')\"",
    "start": "node build/index.js"
  },
  "type": "module"
}
```

### Implementing the MCP Server with Streaming HTTP Support

For the MCPControl server implementation, we'll create a server that can control various aspects of the computer. Here's the basic structure:

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({ 
  name: "MCPControl", 
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Implement computer control tools
server.tool(
  "mouse_move",
  { 
    x: z.number().describe("X coordinate to move mouse to"),
    y: z.number().describe("Y coordinate to move mouse to") 
  },
  async ({ x, y }) => {
    // Implement mouse movement logic here
    console.log(`Moving mouse to (${x}, ${y})`);
    return { 
      content: [{ type: "text", text: `Mouse moved to position (${x}, ${y})` }]
    };
  }
);

// Add more tools for keyboard, window management, etc.

// Determine which transport to use based on command-line args
const transportType = process.argv.includes("--http") ? "http" : "stdio";

async function main() {
  try {
    if (transportType === "http") {
      // HTTP Stream transport setup
      const port = parseInt(process.env.PORT || "3000");
      const httpTransport = new StreamableHTTPServerTransport({
        port,
        cors: {
          origins: ["*"],
          headers: ["Content-Type", "Accept", "Authorization", "x-api-key", "Mcp-Session-Id", "Last-Event-ID"],
          methods: ["GET", "POST", "DELETE", "OPTIONS"],
          credentials: true
        }
      });
      
      console.log(`Starting MCPControl server with HTTP transport on port ${port}`);
      await server.connect(httpTransport);
    } else {
      // Stdio transport setup
      console.log("Starting MCPControl server with STDIO transport");
      const stdioTransport = new StdioServerTransport();
      await server.connect(stdioTransport);
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
```

## Streaming HTTP Protocol Implementation Details

The Streamable HTTP transport in MCP 1.10.2 uses HTTP POST to send JSON-RPC messages to the MCP endpoint. Clients must include an Accept header listing both application/json and text/event-stream as supported content types.

### Server-Side Implementation

The HTTP Stream Transport server should:

1. Provide a single HTTP endpoint that supports both POST and GET methods
2. Handle JSON-RPC 2.0 message exchange
3. Support Server-Sent Events (SSE) for streaming responses
4. Implement proper session management

### Client-Side Implementation

Clients connecting to your MCP server should:

1. Send JSON-RPC requests via HTTP POST
2. Include proper Accept headers for both JSON and SSE
3. Handle session management via the Mcp-Session-Id header
4. Process both batch (JSON) and streaming (SSE) responses

## StreamableHTTPServerTransport Implementation

The StreamableHTTPServerTransport requires a different configuration approach than what was initially described. Here's the correct implementation based on SDK 1.10.2:

```typescript
// src/http-transport.ts
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export function createHttpTransport() {
  // Create Express app
  const app = express();
  
  // Configure CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-api-key', 'Mcp-Session-Id', 'Last-Event-ID'],
    exposedHeaders: ['Mcp-Session-Id'],
    credentials: true
  }));
  
  // Session storage
  const sessions = new Map();
  
  // Create StreamableHTTP transport
  const transport = new StreamableHTTPServerTransport({
    // Generate a session ID
    sessionIdGenerator: () => {
      const sessionId = randomUUID();
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      });
      return sessionId;
    },
    
    // Session initialization handler (optional)
    onsessioninitialized: (sessionId) => {
      console.log(`Session initialized with ID: ${sessionId}`);
    }
  });
  
  // Set up Express routes
  const endpoint = '/mcp';
  
  // Handle POST requests
  app.post(endpoint, async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(`Error handling POST request: ${err.message}`);
      
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });
  
  // Handle GET requests for SSE streaming
  app.get(endpoint, async (req, res) => {
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error(`Error handling GET request: ${err.message}`);
      
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });
  
  // Handle DELETE requests for session termination
  app.delete(endpoint, async (req, res) => {
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error(`Error handling DELETE request: ${err.message}`);
      
      if (!res.headersSent) {
        res.status(500).send('Error closing session');
      }
    }
  });
  
  // Start HTTP server
  const port = 3000;
  app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
  });
  
  return transport;
}
```

## Configuring MCPControl in Claude Desktop

To use MCPControl with Claude, you need to configure your Claude MCP settings as follows:

```json
{
  "mcpServers": {
    "MCPControl": {
      "command": "npx",
      "args": [
        "--no-cache",
        "-y",
        "mcp-control"
      ]
    }
  }
}
```

### Security Best Practices

When implementing the HTTP Stream transport, consider these security best practices:

1. **Always use API key authentication:**
   ```
   # Set a strong API key (minimum 16 characters)
   export API_KEY="$(openssl rand -base64 32)"
   ```

2. **Restrict CORS origins to known domains:**
   ```
   # For local development
   export CORS_ORIGINS="localhost"
   
   # For production with multiple domains
   export CORS_ORIGINS="https://example.com,https://admin.example.com"
   ```

3. **Use HTTPS in production environments:**
   When exposing your MCP server publicly, always use HTTPS with a valid SSL certificate.

4. **Implement proper input validation:**
   Validate all inputs using Zod or similar validation libraries.

For a locally built server, you would modify this to point to your build:

```json
{
  "mcpServers": {
    "MCPControl": {
      "command": "node",
      "args": [
        "/path/to/your/build/index.js"
      ]
    }
  }
}
```

For HTTP transport, you would use a URL configuration:

```json
{
  "mcpServers": {
    "MCPControl": {
      "type": "http-stream",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "x-api-key": "your-api-key-if-needed"
      }
    }
  }
}
```

## Advanced Features for MCPControl

### Session Management in Streaming HTTP

An MCP "session" consists of logically related interactions between a client and a server, beginning with the initialization phase.

When implementing session management:

1. Generate a unique session ID when a client connects
2. Include the session ID in the Mcp-Session-Id header of responses
3. Expect clients to include this ID in subsequent requests
4. Use the session context to maintain state across requests

Example session tracking implementation:

```typescript
// Basic session tracking
const sessions = new Map();

function createSession(clientInfo) {
  const sessionId = generateUniqueId();
  sessions.set(sessionId, {
    id: sessionId,
    clientInfo,
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  });
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActiveAt = Date.now();
  }
  return session;
}
```

### Streaming Responses

MCP supports streaming responses for tools and resources, allowing servers to send data incrementally. This is particularly useful for large outputs or long-running operations.

To implement streaming:

1. Send partial content using SSE events
2. Use event IDs to enable resumability
3. Report progress for long-running operations

Example of a streaming tool response:

```typescript
server.tool(
  "long_running_operation",
  { operation: z.string() },
  async ({ operation }, context) => {
    // Start the operation
    const operationId = startOperation(operation);
    
    // Create a response stream
    const stream = context.createStream();
    
    // Send progress updates
    const progressInterval = setInterval(() => {
      const progress = getOperationProgress(operationId);
      stream.sendProgress(progress);
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        
        // Send final result
        stream.sendResult({
          content: [{ type: "text", text: `Operation ${operation} completed successfully!` }]
        });
        
        // Close the stream
        stream.end();
      }
    }, 1000);
    
    // Return initial response
    return {
      content: [{ type: "text", text: `Started operation ${operation} with ID ${operationId}` }],
      stream: true // Indicate that this is a streaming response
    };
  }
);
```

## Security Considerations

When developing an MCP server that controls the computer:

1. Implement proper authentication and authorization
2. Validate all user inputs
3. Limit the scope of operations to prevent misuse
4. Consider using capability-based security model
5. Log all operations for audit purposes

Example security implementation:

```typescript
// Authentication middleware
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Unauthorized"
      },
      id: null
    });
  }
  
  next();
}

// Apply to Express app
app.use('/mcp', authenticate);
```

## Complete Implementation for MCPControl

Here's a more comprehensive implementation for the MCPControl server:

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import cors from 'cors';
import { z } from "zod";

// Create Express app for HTTP transport
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-api-key', 'Mcp-Session-Id', 'Last-Event-ID'],
  exposedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Mcp-Session-Id', 'Mcp-Session-Id'],
  credentials: true
}));

// Create server instance
const server = new McpServer({ 
  name: "MCPControl", 
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Mouse tools
server.tool(
  "mouse_move",
  { 
    x: z.number().describe("X coordinate to move mouse to"),
    y: z.number().describe("Y coordinate to move mouse to") 
  },
  async ({ x, y }) => {
    // Implement mouse movement logic here
    console.log(`Moving mouse to (${x}, ${y})`);
    return { 
      content: [{ type: "text", text: `Mouse moved to position (${x}, ${y})` }]
    };
  }
);

server.tool(
  "mouse_click",
  { 
    button: z.enum(["left", "right", "middle"]).describe("Mouse button to click")
  },
  async ({ button }) => {
    // Implement mouse click logic here
    console.log(`Clicking ${button} mouse button`);
    return { 
      content: [{ type: "text", text: `Clicked ${button} mouse button` }]
    };
  }
);

// Keyboard tools
server.tool(
  "keyboard_type",
  { 
    text: z.string().describe("Text to type")
  },
  async ({ text }) => {
    // Implement keyboard typing logic here
    console.log(`Typing: ${text}`);
    return { 
      content: [{ type: "text", text: `Typed: ${text}` }]
    };
  }
);

server.tool(
  "keyboard_press",
  { 
    key: z.string().describe("Key to press (e.g., 'Enter', 'Escape', 'F1')")
  },
  async ({ key }) => {
    // Implement key press logic here
    console.log(`Pressing key: ${key}`);
    return { 
      content: [{ type: "text", text: `Pressed key: ${key}` }]
    };
  }
);

// Window management tools
server.tool(
  "window_list",
  {},
  async () => {
    // Implement window listing logic here
    const windows = ["Window 1", "Window 2", "Window 3"]; // Placeholder
    console.log(`Listing windows: ${windows.join(", ")}`);
    return { 
      content: [{ type: "text", text: `Windows: ${windows.join(", ")}` }]
    };
  }
);

server.tool(
  "window_focus",
  { 
    title: z.string().describe("Title or part of the title of the window to focus")
  },
  async ({ title }) => {
    // Implement window focus logic here
    console.log(`Focusing window: ${title}`);
    return { 
      content: [{ type: "text", text: `Focused window: ${title}` }]
    };
  }
);

// Screen capture tools
server.tool(
  "get_screenshot",
  { 
    region: z.object({
      x: z.number().optional().describe("X coordinate of the top-left corner"),
      y: z.number().optional().describe("Y coordinate of the top-left corner"),
      width: z.number().optional().describe("Width of the region"),
      height: z.number().optional().describe("Height of the region")
    }).optional().describe("Region to capture, or full screen if omitted")
  },
  async ({ region }) => {
    // Implement screen capture logic here
    console.log(`Capturing screenshot ${region ? "of region" : "of full screen"}`);
    
    // Placeholder for screenshot data
    const screenshotBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==";
    
    return { 
      content: [
        { type: "text", text: `Captured screenshot ${region ? "of region" : "of full screen"}` },
        { type: "image", format: "png", data: screenshotBase64 }
      ]
    };
  }
);

// Determine which transport to use based on command-line args
const transportType = process.argv.includes("--http") ? "http" : "stdio";

async function main() {
  try {
    if (transportType === "http") {
      // HTTP Stream transport setup
      const port = parseInt(process.env.PORT || "3000");
      const httpTransport = new StreamableHTTPServerTransport({
        port,
        app,
        path: '/mcp',
        cors: {
          origins: ["*"],
          headers: ["Content-Type", "Accept", "Authorization", "x-api-key", "Mcp-Session-Id", "Last-Event-ID"],
          methods: ["GET", "POST", "DELETE", "OPTIONS"],
          credentials: true
        }
      });
      
      console.log(`Starting MCPControl server with HTTP transport on port ${port}`);
      await server.connect(httpTransport);
      
      // Start Express server (optional if using the built-in server)
      app.listen(port + 1, () => {
        console.log(`Express server listening on port ${port + 1}`);
      });
    } else {
      // Stdio transport setup
      console.log("Starting MCPControl server with STDIO transport");
      const stdioTransport = new StdioServerTransport();
      await server.connect(stdioTransport);
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
```

## SDK 1.10.2 API Reference

### StreamableHTTPServerTransport Options

The StreamableHTTPServerTransport constructor takes the following parameters:

```typescript
interface StreamableHTTPServerTransportOptions {
  /**
   * Function that generates a session ID for the transport.
   * The session ID SHOULD be globally unique and cryptographically secure
   */
  sessionIdGenerator: (() => string) | undefined;
  
  /**
   * A callback for session initialization events
   */
  onsessioninitialized?: (sessionId: string) => void;
  
  /**
   * If true, the server will return JSON responses instead of starting an SSE stream.
   * Default is false (SSE streams are preferred).
   */
  enableJsonResponse?: boolean;
  
  /**
   * Event store for resumability support
   * If provided, resumability will be enabled, allowing clients to reconnect and resume messages
   */
  eventStore?: EventStore;
}
```

### StreamableHTTPServerTransport Methods

```typescript
class StreamableHTTPServerTransport {
  // Constructor
  constructor(options: StreamableHTTPServerTransportOptions);
  
  // Handle HTTP requests
  async handleRequest(req: Request, res: Response, body?: any): Promise<void>;
  
  // Close the transport
  async close(): Promise<void>;
}
```

### StreamableHTTPClientTransport Options

```typescript
interface StreamableHTTPClientTransportOptions {
  // Base URL for the MCP endpoint
  baseUrl: string;
  
  // Optional headers to send with requests
  headers?: Record<string, string>;
  
  // Fetch implementation (defaults to global fetch)
  fetch?: typeof fetch;
}
```

## Implementing Resumable Connections with Last-Event-ID

Server-Sent Events (SSE) provide native support for resumable connections through the `Last-Event-ID` header. This allows clients to reconnect and continue receiving events after a connection interruption without missing any events that occurred during the disconnection period.

### Client-Side Implementation

To implement resumable connections in your client application:

1. **Track the last event ID received**:
   ```javascript
   let lastEventId = '';
   
   eventSource.addEventListener('message', (event) => {
     // Store the latest event ID when processing each message
     if (event.lastEventId) {
       lastEventId = event.lastEventId;
     }
     
     // Process the event data
     const data = JSON.parse(event.data);
     // Handle the event...
   });
   ```

2. **Reconnect with Last-Event-ID header**:
   ```javascript
   function createEventSource(url, sessionId) {
     // Close existing EventSource if it exists
     if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
       eventSource.close();
     }
     
     // Create headers object for EventSource
     const headers = {
       'x-api-key': apiKey,
       'Mcp-Session-Id': sessionId
     };
     
     // Add Last-Event-ID if we have one from previous connection
     if (lastEventId) {
       headers['Last-Event-ID'] = lastEventId;
     }
     
     // Create new EventSource with headers
     const eventSource = new EventSourceWithAuth(url, {
       headers: headers
     });
     
     return eventSource;
   }
   ```

3. **Handle reconnection logic**:
   ```javascript
   function setupEventSource() {
     const eventSource = createEventSource(mcpUrl, sessionId);
     
     // Set up error handling for reconnection
     eventSource.onerror = (error) => {
       console.error('EventSource error:', error);
       
       // Wait before attempting to reconnect
       setTimeout(() => {
         console.log('Reconnecting with last event ID:', lastEventId);
         setupEventSource();
       }, 5000); // 5 second delay before reconnect
     };
     
     return eventSource;
   }
   ```

### Testing Resumable Connections

To test your implementation of resumable connections:

1. Start your client application and establish an SSE connection
2. Monitor the events being received
3. Forcibly disconnect the connection (e.g., by stopping the server temporarily)
4. Restart the server and observe the client behavior
5. Verify that the client reconnects with the `Last-Event-ID` header
6. Confirm that any events missed during the disconnection are replayed

### Browser and Network Considerations

Some important details to consider for robust implementation:

1. **Browser Support**: Most modern browsers support the EventSource API and Last-Event-ID header.

2. **Proxies and Load Balancers**: Some proxies may strip or modify HTTP headers. Ensure your infrastructure preserves the Last-Event-ID header.

3. **Connection Timeouts**: Configure appropriate timeouts for your EventSource connections. Some networks might have aggressive timeout policies.

4. **EventSource Polyfills**: For environments without native EventSource support, you can use polyfills that implement the Last-Event-ID functionality.

5. **Event ID Structure**: The MCPControl implementation uses a format of `streamId-timestamp-random` for event IDs. This allows for efficient retrieval of events for a specific stream.

### Event Store Configuration

The MCPControl EventStore can be configured to control memory usage and event retention:

```javascript
// Set environment variables to configure the event store
process.env.MAX_EVENTS = "20000";            // Maximum events to store in memory
process.env.MAX_EVENT_AGE_MINUTES = "60";    // Maximum age in minutes before events are removed
```

These settings help balance between having enough event history for resumability while preventing excessive memory usage.

## Conclusion

The MCP Protocol 1.10.2 with Streaming HTTP support provides a robust and flexible way to build servers that can be controlled by AI assistants like Claude. The MCPControl implementation allows for programmatic control of the computer while maintaining security and scalability.

By leveraging the Streaming HTTP transport with resumable connections, you can build more responsive and fault-tolerant MCP servers that can handle connection interruptions, provide seamless recovery, and maintain persistent connections with clients even in unstable network environments.

When implementing HTTP streaming, it's important to use the correct class names and API structures as documented here, as the API may differ from earlier documentation.
