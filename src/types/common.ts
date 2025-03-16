export interface MousePosition {
  x: number;
  y: number;
}

export interface KeyboardInput {
  text: string;
}

export interface KeyCombination {
  keys: string[];  // Array of keys to be pressed together, e.g. ["control", "c"]
}

export interface KeyHoldOperation {
  key: string;     // The key to hold
  duration?: number; // Duration in milliseconds (optional when state is 'up')
  state: 'down' | 'up'; // Whether to press down or release the key
}

export interface WindowInfo {
  title: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export interface ClipboardInput {
  text: string;
}

// Type for mouse button mapping
export type ButtonMap = {
  [key: string]: string;
  left: string;
  right: string;
  middle: string;
};

// New types for screen search functionality
export interface ImageSearchOptions {
  confidence?: number;  // Match confidence threshold (0-1)
  searchRegion?: {     // Region to search within
    x: number;
    y: number;
    width: number;
    height: number;
  };
  waitTime?: number;   // Max time to wait for image in ms
}

export interface ImageSearchResult {
  location: {
    x: number;
    y: number;
  };
  confidence: number;
  width: number;
  height: number;
}

export interface HighlightOptions {
  duration?: number;   // Duration to show highlight in ms
  color?: string;     // Color of highlight (hex format)
}

// New interface for screenshot options
export interface ScreenshotOptions {
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality?: number;       // JPEG quality (1-100), only used if format is 'jpeg'
  format?: 'png' | 'jpeg'; // Output format
  grayscale?: boolean;    // Convert to grayscale
  resize?: {              // Resize options
    width?: number;       // Target width (maintains aspect ratio if only one dimension provided)
    height?: number;      // Target height
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'; // Resize fit option
  };
  compressionLevel?: number; // PNG compression level (0-9), only used if format is 'png'
}
