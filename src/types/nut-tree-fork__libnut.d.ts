declare module '@nut-tree-fork/libnut' {
  export function typeString(str: string): void;
  export function keyTap(key: string): void;
  export function keyToggle(key: string, state: 'down' | 'up'): void;
  export function moveMouse(x: number, y: number): void;
  export function mouseClick(button?: string, double?: boolean): void;
  export function mouseToggle(state: 'down' | 'up', button?: string): void;
  export function scrollMouse(x: number, y: number): void;
  export function getMousePos(): { x: number; y: number };
  export const screen: {
    capture: (
      x?: number,
      y?: number,
      width?: number,
      height?: number,
    ) => {
      width: number;
      height: number;
      image: Buffer;
    };
  };
  export function getScreenSize(): { width: number; height: number };
  export function getWindows(): number[];
  export function getWindowTitle(handle: number): string;
  export function resizeWindow(handle: number, size: { width: number; height: number }): void;
  export function moveWindow(handle: number, position: { x: number; y: number }): void;
  export function setWindowFocus(handle: number): void;
  export function getActiveWindow(): number;
  export function getWindowRect(handle: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  export function focusWindow(handle: number): void;
}
