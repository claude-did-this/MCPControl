interface ImageContent {
  type: "image";
  data: string;  // base64 encoded image data
  mimeType: string;
}

export interface ScreenshotResponse {
  screenshot: string;  // base64 encoded image data
  timestamp: string;
}

export interface WindowsControlResponse {
  success: boolean;
  message: string;
  data?: any;
  screenshot?: string;  // base64 encoded image data for screenshot responses
  content?: ImageContent[];  // MCP image content for screenshots
}
