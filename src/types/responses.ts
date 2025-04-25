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

/**
 * Provides information about streaming operation progress
 */
export interface StreamingProgressInfo {
  /**
   * Current progress as a percentage (0-100)
   */
  progress: number;

  /**
   * Whether the operation has completed
   */
  isComplete: boolean;

  /**
   * Current step number
   */
  currentStep?: number;

  /**
   * Total number of steps
   */
  totalSteps?: number;

  /**
   * Current chunk index when processing in chunks
   */
  currentChunk?: number;

  /**
   * Total number of chunks
   */
  totalChunks?: number;
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
