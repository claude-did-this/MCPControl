export interface MousePosition {
  x: number;
  y: number;
}

export interface KeyboardInput {
  text: string;
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

// Type for mouse button mapping
export type ButtonMap = {
  [key: string]: number;
  left: number;
  right: number;
  middle: number;
};
