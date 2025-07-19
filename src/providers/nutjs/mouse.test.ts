import { describe, it, expect, vi, beforeEach } from 'vitest';
import libnut from '@nut-tree-fork/libnut';
import { NutJSMouseAutomation } from './mouse.js';

// Mock libnut
vi.mock('@nut-tree-fork/libnut', () => ({
  default: {
    moveMouse: vi.fn(),
    mouseClick: vi.fn(),
    getMousePos: vi.fn(),
    mouseToggle: vi.fn(),
    scrollMouse: vi.fn(),
  },
}));

describe('NutJSMouseAutomation', () => {
  let mouseAutomation: NutJSMouseAutomation;

  beforeEach(() => {
    vi.clearAllMocks();
    mouseAutomation = new NutJSMouseAutomation();
    // Setup default mock for getMousePos
    (libnut.getMousePos as any).mockReturnValue({ x: 0, y: 0 });
  });

  describe('moveMouse', () => {
    it('should move mouse to the specified position', () => {
      const result = mouseAutomation.moveMouse({ x: 100, y: 200 });

      expect(libnut.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Mouse moved to position (100, 200)');
    });

    it('should handle errors', () => {
      (libnut.moveMouse as any).mockImplementationOnce(() => {
        throw new Error('Move error');
      });

      const result = mouseAutomation.moveMouse({ x: 100, y: 200 });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to move mouse: Move error');
    });
  });

  describe('clickMouse', () => {
    it('should click the specified mouse button', () => {
      const result = mouseAutomation.clickMouse('right');

      expect(libnut.mouseClick).toHaveBeenCalledWith('right');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked right mouse button');
    });

    it('should use left button by default', () => {
      const result = mouseAutomation.clickMouse();

      expect(libnut.mouseClick).toHaveBeenCalledWith('left');
      expect(result.success).toBe(true);
    });

    it('should handle errors', () => {
      (libnut.mouseClick as any).mockImplementationOnce(() => {
        throw new Error('Click error');
      });

      const result = mouseAutomation.clickMouse('left');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to click mouse: Click error');
    });
  });

  describe('doubleClick', () => {
    it('should double-click at the current position', () => {
      const result = mouseAutomation.doubleClick();

      expect(libnut.moveMouse).not.toHaveBeenCalled();
      expect(libnut.mouseClick).toHaveBeenCalledWith('left', true);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Double clicked at current position');
    });

    it('should double-click at the specified position', () => {
      const result = mouseAutomation.doubleClick({ x: 100, y: 200 });

      expect(libnut.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(libnut.mouseClick).toHaveBeenCalledWith('left', true);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Double clicked at position (100, 200)');
    });

    it('should handle errors when moving mouse', () => {
      (libnut.moveMouse as any).mockImplementationOnce(() => {
        throw new Error('Move error');
      });

      const result = mouseAutomation.doubleClick({ x: 100, y: 200 });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to double click: Move error');
    });

    it('should handle errors when clicking', () => {
      (libnut.mouseClick as any).mockImplementationOnce(() => {
        throw new Error('Click error');
      });

      const result = mouseAutomation.doubleClick();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to double click: Click error');
    });
  });

  describe('getCursorPosition', () => {
    it('should get the current cursor position', () => {
      (libnut.getMousePos as any).mockReturnValue({ x: 300, y: 400 });

      const result = mouseAutomation.getCursorPosition();

      expect(libnut.getMousePos).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ x: 300, y: 400 });
    });

    it('should handle errors', () => {
      (libnut.getMousePos as any).mockImplementationOnce(() => {
        throw new Error('Position error');
      });

      const result = mouseAutomation.getCursorPosition();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to get cursor position: Position error');
    });
  });

  describe('clickAt', () => {
    it('should move to position, click, and return to original position', () => {
      (libnut.getMousePos as any).mockReturnValue({ x: 10, y: 20 });

      const result = mouseAutomation.clickAt(100, 200);

      expect(libnut.getMousePos).toHaveBeenCalledTimes(1);
      expect(libnut.moveMouse).toHaveBeenCalledTimes(2);
      expect(libnut.mouseClick).toHaveBeenCalledTimes(1);

      expect(libnut.moveMouse).toHaveBeenNthCalledWith(1, 100, 200);
      expect(libnut.moveMouse).toHaveBeenNthCalledWith(2, 10, 20);
      expect(libnut.mouseClick).toHaveBeenCalledWith('left');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Clicked left button at position (100, 200)');
    });

    it('should return error for invalid coordinates', () => {
      const result = mouseAutomation.clickAt(NaN, 200);

      expect(libnut.moveMouse).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates provided');
    });

    it('should handle errors getting cursor position', () => {
      (libnut.getMousePos as any).mockImplementationOnce(() => {
        throw new Error('Position error');
      });

      const result = mouseAutomation.clickAt(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to click at position: Position error');
    });

    it('should handle errors when moving mouse', () => {
      (libnut.getMousePos as any).mockReturnValue({ x: 10, y: 20 });
      (libnut.moveMouse as any).mockImplementationOnce(() => {
        throw new Error('Move error');
      });

      const result = mouseAutomation.clickAt(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to click at position: Move error');
    });

    it('should handle errors when clicking', () => {
      (libnut.getMousePos as any).mockReturnValue({ x: 10, y: 20 });
      (libnut.mouseClick as any).mockImplementationOnce(() => {
        throw new Error('Click error');
      });

      const result = mouseAutomation.clickAt(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to click at position: Click error');
    });
  });

  describe('scrollMouse', () => {
    it('should scroll down with positive amount', () => {
      const result = mouseAutomation.scrollMouse(10);

      expect(libnut.scrollMouse).toHaveBeenCalledWith(0, 10);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Scrolled mouse down by 10 units');
    });

    it('should scroll up with negative amount', () => {
      const result = mouseAutomation.scrollMouse(-5);

      expect(libnut.scrollMouse).toHaveBeenCalledWith(0, -5);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Scrolled mouse up by 5 units');
    });

    it('should handle errors', () => {
      (libnut.scrollMouse as any).mockImplementationOnce(() => {
        throw new Error('Scroll error');
      });

      const result = mouseAutomation.scrollMouse(10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to scroll mouse: Scroll error');
    });
  });

  describe('dragMouse', () => {
    it('should perform drag operation correctly', () => {
      const from = { x: 100, y: 200 };
      const to = { x: 300, y: 400 };

      const result = mouseAutomation.dragMouse(from, to, 'right');

      expect(libnut.moveMouse).toHaveBeenCalledTimes(2);
      expect(libnut.moveMouse).toHaveBeenNthCalledWith(1, 100, 200);
      expect(libnut.moveMouse).toHaveBeenNthCalledWith(2, 300, 400);

      expect(libnut.mouseToggle).toHaveBeenCalledTimes(2);
      expect(libnut.mouseToggle).toHaveBeenNthCalledWith(1, 'down', 'right');
      expect(libnut.mouseToggle).toHaveBeenNthCalledWith(2, 'up', 'right');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dragged from (100, 200) to (300, 400) with right button');
    });

    it('should use left button by default', () => {
      const result = mouseAutomation.dragMouse({ x: 10, y: 20 }, { x: 30, y: 40 });

      expect(libnut.mouseToggle).toHaveBeenNthCalledWith(1, 'down', 'left');
      expect(result.success).toBe(true);
    });

    it('should handle errors and release mouse button', () => {
      (libnut.moveMouse as any).mockImplementationOnce(() => {});
      (libnut.mouseToggle as any).mockImplementationOnce(() => {});
      (libnut.moveMouse as any).mockImplementationOnce(() => {
        throw new Error('Drag error');
      });

      const result = mouseAutomation.dragMouse({ x: 10, y: 20 }, { x: 30, y: 40 });

      expect(libnut.mouseToggle).toHaveBeenCalledTimes(2); // Once for down, once for cleanup
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to drag mouse: Drag error');
    });

    it('should return error for invalid coordinates', () => {
      const result = mouseAutomation.dragMouse({ x: NaN, y: 200 }, { x: 300, y: 400 });

      expect(libnut.moveMouse).not.toHaveBeenCalled();
      expect(libnut.mouseToggle).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates provided');
    });
  });

  describe('moveMouse', () => {
    it('should return error for invalid coordinates', () => {
      const result = mouseAutomation.moveMouse({ x: NaN, y: 200 });

      expect(libnut.moveMouse).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates provided');
    });
  });
});
