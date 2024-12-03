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
  [key: string]: number;
  left: number;
  right: number;
  middle: number;
};
