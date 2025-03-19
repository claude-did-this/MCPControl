import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeysenderScreenAutomation } from './screen.js';
import { getScreenSize } from 'keysender';

// Create mock functions
const mockCapture = vi.fn().mockImplementation((part, _format) => {
  // Mock different capture behaviors based on arguments
  if (part && typeof part === 'object') {
    // Region capture
    return {
      data: Buffer.from('region-screenshot-data'),
      width: part.width,
      height: part.height
    };
  } else {
    // Full screen capture
    return {
      data: Buffer.from('full-screenshot-data'),
      width: 1920,
      height: 1080
    };
  }
});

const mockGet = vi.fn().mockReturnValue({
  title: 'Test Window',
  className: 'TestClass',
  handle: 12345
});

const mockGetView = vi.fn().mockReturnValue({
  x: 100,
  y: 200,
  width: 800,
  height: 600
});

const mockSet = vi.fn().mockReturnValue(true);
const mockSetForeground = vi.fn();
const mockSetView = vi.fn();

// Mock the keysender library
vi.mock('keysender', () => {
  return {
    Hardware: vi.fn().mockImplementation(() => ({
      workwindow: {
        capture: mockCapture,
        get: mockGet,
        set: mockSet,
        getView: mockGetView,
        setForeground: mockSetForeground,
        setView: mockSetView
      }
    })),
    getScreenSize: vi.fn().mockReturnValue({
      width: 1920,
      height: 1080
    })
  };
});

describe('KeysenderScreenAutomation', () => {
  let screenAutomation: KeysenderScreenAutomation;

  beforeEach(() => {
    screenAutomation = new KeysenderScreenAutomation();
    vi.clearAllMocks();
  });

  describe('getScreenSize', () => {
    it('should return screen dimensions from keysender', () => {
      const result = screenAutomation.getScreenSize();

      expect(getScreenSize).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        width: 1920,
        height: 1080
      });
    });

    it('should handle errors gracefully', () => {
      // Mock getScreenSize to throw an error
      (getScreenSize as any).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = screenAutomation.getScreenSize();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Test error');
    });
  });

  describe('getScreenshot', () => {
    it('should capture full screen when no region is specified', async () => {
      const result = await screenAutomation.getScreenshot();

      // Check that workwindow.capture was called with the right parameters
      expect(mockCapture).toHaveBeenCalledWith('rgba');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        width: 1920,
        height: 1080
      });
      expect(result.screenshot).toBeDefined();
      expect(result.encoding).toBe('base64');
      expect(result.content?.[0].type).toBe('image');
    });

    it('should capture a specific region when region is specified', async () => {
      const region = { x: 100, y: 200, width: 300, height: 400 };
      const result = await screenAutomation.getScreenshot({ region });

      // Check that workwindow.capture was called with the right parameters
      expect(mockCapture).toHaveBeenCalledWith(region, 'rgba');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        width: 300,
        height: 400
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock workwindow.capture to throw an error
      mockCapture.mockImplementationOnce(() => {
        throw new Error('Capture error');
      });

      const result = await screenAutomation.getScreenshot();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Capture error');
    });
  });

  describe('getActiveWindow', () => {
    it('should return information about the active window', () => {
      const result = screenAutomation.getActiveWindow();
      
      expect(mockGet).toHaveBeenCalled();
      expect(mockGetView).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Test Window',
        className: 'TestClass',
        handle: 12345,
        position: {
          x: 100,
          y: 200
        },
        size: {
          width: 800,
          height: 600
        }
      });
    });
    
    it('should handle missing window information gracefully', () => {
      // Mock get to return incomplete data
      mockGet.mockReturnValueOnce({});
      mockGetView.mockReturnValueOnce({});
      
      const result = screenAutomation.getActiveWindow();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Unknown',
        className: 'Unknown',
        handle: 0,
        position: {
          x: 0,
          y: 0
        },
        size: {
          width: 0,
          height: 0
        }
      });
    });
  });
  
  describe('focusWindow', () => {
    it('should focus a window by title', () => {
      const result = screenAutomation.focusWindow('Test Window');
      
      expect(mockSet).toHaveBeenCalledWith('Test Window', null);
      expect(mockSetForeground).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Focused window');
    });
    
    it('should handle window not found', () => {
      // Mock set to throw an error
      mockSet.mockImplementationOnce(() => {
        throw new Error('Window not found');
      });
      
      const result = screenAutomation.focusWindow('Nonexistent Window');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not find window');
    });
  });
  
  describe('resizeWindow', () => {
    it('should resize a window to specified dimensions', () => {
      const result = screenAutomation.resizeWindow('Test Window', 1024, 768);
      
      expect(mockSet).toHaveBeenCalledWith('Test Window', null);
      expect(mockSetForeground).toHaveBeenCalled();
      expect(mockSetView).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        width: 1024,
        height: 768
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Resized window');
      // The test should expect the values from mockGetView, not the requested values,
      // since we're mocking the updatedView to return the original values
      expect(result.data).toEqual({
        title: 'Test Window',
        position: {
          x: 100,
          y: 200
        },
        size: {
          width: 800,
          height: 600
        }
      });
    });
  });
  
  describe('repositionWindow', () => {
    it('should reposition a window to specified coordinates', () => {
      const result = screenAutomation.repositionWindow('Test Window', 50, 100);
      
      expect(mockSet).toHaveBeenCalledWith('Test Window', null);
      expect(mockSetForeground).toHaveBeenCalled();
      expect(mockSetView).toHaveBeenCalledWith({
        x: 50,
        y: 100,
        width: 800,
        height: 600
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Repositioned window');
      // The test should expect the values from mockGetView, not the requested values,
      // since we're mocking the updatedView to return the original values
      expect(result.data).toEqual({
        title: 'Test Window',
        position: {
          x: 100,
          y: 200
        },
        size: {
          width: 800,
          height: 600
        }
      });
    });
  });
});
