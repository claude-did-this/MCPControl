interface ImageContent {
  type: 'image';
  data: Buffer | string; // Buffer for binary data, string for base64
  mimeType: string;
  encoding?: 'binary' | 'base64'; // Specify the encoding type
}

export interface ScreenshotResponse {
  screenshot: Buffer | string; // Buffer for binary data, string for base64
  timestamp: string;
  encoding: 'binary' | 'base64';
}

export interface StreamingProgressInfo {
  progress: number; // 0-100 percentage
  isComplete: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export interface WindowsControlResponse {
  success: boolean;
  message: string;
  data?: unknown;
  screenshot?: Buffer | string; // Buffer for binary data, string for base64
  content?: ImageContent[]; // MCP image content for screenshots
  encoding?: 'binary' | 'base64'; // Specify the encoding type
  stream?: boolean; // Indicates if this is a streaming response
  streamInfo?: StreamingProgressInfo; // Information about streaming progress
}
