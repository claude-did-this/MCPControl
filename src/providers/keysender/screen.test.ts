import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeysenderScreenAutomation } from './screen.js';

// Properly mock keysender without any hoisting issues
vi.mock('keysender', async () => {
  // This empty import() is important to make Vitest properly track the module
  await vi.importActual('vitest');

  // Define mocks inline within this function to avoid hoisting problems
  const mockCapture = vi.fn().mockImplementation((part, _format) => {
    return part && typeof part === 'object'
      ? { data: Buffer.from('region-screenshot-data'), width: part.width, height: part.height }
      : { data: Buffer.from('full-screenshot-data'), width: 1920, height: 1080 };
  });

  const mockGet = vi.fn().mockReturnValue({
    title: 'Test Window',
    className: 'TestClass',
    handle: 12345,
  });

  const mockGetView = vi.fn().mockReturnValue({
    x: 100,
    y: 200,
    width: 800,
    height: 600,
  });

  const mockSet = vi.fn().mockReturnValue(true);
  const mockSetForeground = vi.fn();
  const mockSetView = vi.fn();

  // Create the mock object with all the required functions
  const mockObject = {
    Hardware: vi.fn().mockImplementation(() => ({
      workwindow: {
        capture: mockCapture,
        get: mockGet,
        set: mockSet,
        getView: mockGetView,
        setForeground: mockSetForeground,
        setView: mockSetView,
        isForeground: vi.fn().mockReturnValue(true),
        isOpen: vi.fn().mockReturnValue(true),
      },
    })),
    getScreenSize: vi.fn().mockReturnValue({
      width: 1920,
      height: 1080,
    }),
    getAllWindows: vi
      .fn()
      .mockReturnValue([{ title: 'Test Window', className: 'TestClass', handle: 12345 }]),
    getWindowChildren: vi.fn().mockReturnValue([]),
  };

  // Return both default export and named exports
  return {
    default: mockObject, // Add default export to match 'import pkg from 'keysender''
    ...mockObject, // Spread the same object as named exports
  };
});

describe('KeysenderScreenAutomation', () => {
  let screenAutomation: KeysenderScreenAutomation;
  let keysender: any;
  let mockCapture: any;
  let mockGet: any;
  let mockGetView: any;
  let mockSet: any;
  let mockSetForeground: any;
  let mockSetView: any;
  let mockGetScreenSize: any;
  let mockGetAllWindows: any;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Import the mocked module to get access to the mock functions
    // Using dynamic import to get the mocked module
    keysender = await import('keysender');

    // Get references to mocks from the hardware instance
    const hardware = keysender.Hardware();
    mockCapture = hardware.workwindow.capture;
    mockGet = hardware.workwindow.get;
    mockGetView = hardware.workwindow.getView;
    mockSet = hardware.workwindow.set;
    mockSetForeground = hardware.workwindow.setForeground;
    mockSetView = hardware.workwindow.setView;

    // Get references to other mocks
    mockGetScreenSize = keysender.getScreenSize;
    mockGetAllWindows = keysender.getAllWindows;

    // Create a new instance for each test
    screenAutomation = new KeysenderScreenAutomation();
  });

  describe('getScreenSize', () => {
    it('should return screen dimensions from keysender', () => {
      const result = screenAutomation.getScreenSize();

      expect(mockGetScreenSize).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        width: 1920,
        height: 1080,
      });
    });

    it('should handle errors gracefully', () => {
      // Mock getScreenSize to throw an error
      mockGetScreenSize.mockImplementationOnce(() => {
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
      // Using 1280 as the standard width for HD Ready resolution
      // This is a common standard for digital imagery and display scaling
      expect(result.data).toEqual({
        width: 1280,
        height: 720,
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
        height: 400,
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
      // Mock a successful window detection
      mockGetAllWindows.mockReturnValueOnce([
        {
          title: 'Test Window',
          className: 'TestClass',
          handle: 12345,
        },
      ]);

      // Create hardware instance to ensure get and getView are called
      const mockHardware = {
        workwindow: {
          set: mockSet,
          get: mockGet,
          getView: mockGetView,
          isForeground: vi.fn().mockReturnValue(true),
        },
      };

      // Replace hardware instance creation in the class
      vi.spyOn(keysender, 'Hardware').mockReturnValueOnce(mockHardware as any);

      const result = screenAutomation.getActiveWindow();

      expect(mockGetAllWindows).toHaveBeenCalled();
      // These will be called through the findSuitableWindow method
      expect(mockGet).toHaveBeenCalled();
      expect(mockGetView).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          title: 'Test Window',
          className: 'TestClass',
          handle: 12345,
          position: {
            x: 100,
            y: 200,
          },
          size: {
            width: 800,
            height: 600,
          },
        }),
      );
    });

    it('should handle missing window information gracefully', () => {
      // Mock getAllWindows to return empty array
      mockGetAllWindows.mockReturnValueOnce([]);

      const result = screenAutomation.getActiveWindow();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Unknown',
        className: 'Unknown',
        handle: 0,
        position: {
          x: 0,
          y: 0,
        },
        size: {
          width: 0,
          height: 0,
        },
      });
    });
  });

  describe('focusWindow', () => {
    it('should focus a window by title', () => {
      const result = screenAutomation.focusWindow('Test Window');

      expect(mockGetAllWindows).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockSetForeground).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Focused window');
    });

    it('should handle window not found', () => {
      // Mock getAllWindows to return empty array
      mockGetAllWindows.mockReturnValueOnce([]);

      const result = screenAutomation.focusWindow('Nonexistent Window');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not find window');
    });
  });

  describe('resizeWindow', () => {
    it('should resize a window to specified dimensions', async () => {
      const result = await screenAutomation.resizeWindow('Test Window', 1024, 768);

      expect(mockGetAllWindows).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockSetForeground).toHaveBeenCalled();
      expect(mockSetView).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1024,
          height: 768,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('Resized window');
    });
  });

  describe('repositionWindow', () => {
    it('should reposition a window to specified coordinates', async () => {
      const result = await screenAutomation.repositionWindow('Test Window', 50, 100);

      expect(mockGetAllWindows).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockSetForeground).toHaveBeenCalled();
      expect(mockSetView).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 100,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('Repositioned window');
    });
  });
});
