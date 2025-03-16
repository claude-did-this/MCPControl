import { describe, it, expect, vi, beforeEach } from 'vitest';
import libnut from '@nut-tree/libnut';
import { NutJSMouseAutomation } from './mouse.js';

// Mock libnut
vi.mock('@nut-tree/libnut', () => ({
  default: {
    moveMouse: vi.fn(),
    mouseClick: vi.fn(),
    getMousePos: vi.fn(),
    mouseToggle: vi.fn(),
    scrollMouse: vi.fn()
  }
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
  });

  describe('getCursorPosition', () => {
    it('should get the current cursor position', () => {
      (libnut.getMousePos as any).mockReturnValue({ x: 300, y: 400 });

      const result = mouseAutomation.getCursorPosition();

      expect(libnut.getMousePos).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ x: 300, y: 400 });
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
  });
});