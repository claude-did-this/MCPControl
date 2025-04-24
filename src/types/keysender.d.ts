/**
 * Type definitions for keysender module
 */

declare module 'keysender' {
  interface ScreenSize {
    width: number;
    height: number;
  }

  interface WindowInfo {
    title: string;
    className: string;
    handle: number;
  }

  interface ViewInfo {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface CaptureResult {
    data: Buffer;
    width: number;
    height: number;
  }

  interface MousePosition {
    x: number;
    y: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class Hardware {
    constructor(windowHandle?: number);

    keyboard: {
      printText(text: string): Promise<void>;
      sendKey(key: string): Promise<void>;
      toggleKey(key: string | string[], down: boolean, delay?: number): Promise<void>;
    };

    mouse: {
      moveTo(x: number, y: number): Promise<void>;
      click(button?: string): Promise<void>;
      toggle(button: string, down: boolean): Promise<void>;
      getPos(): MousePosition;
      scrollWheel(amount: number): Promise<void>;
    };

    workwindow: {
      get(): WindowInfo;
      set(handle: number): boolean;
      getView(): ViewInfo;
      setView(view: Partial<ViewInfo>): void;
      setForeground(): void;
      isForeground(): boolean;
      isOpen(): boolean;
      capture(
        region?: { x: number; y: number; width: number; height: number },
        format?: string,
      ): CaptureResult;
      capture(format?: string): CaptureResult;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getScreenSize(): ScreenSize;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getAllWindows(): WindowInfo[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getWindowChildren(handle: number): WindowInfo[];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const KeyboardButton: { [key: string]: string };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MouseButton: { [key: string]: string };

  const keysender: {
    Hardware: typeof Hardware;
    KeyboardButton: typeof KeyboardButton;
    MouseButton: typeof MouseButton;
    getScreenSize: typeof getScreenSize;
    getAllWindows: typeof getAllWindows;
    getWindowChildren: typeof getWindowChildren;
  };

  export default keysender;
}
