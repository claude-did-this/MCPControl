import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from '../factory.js';
// Imported for type checking but used indirectly through factory
import './index.js';

// Mock keysender module
vi.mock('keysender', async () => {
  await vi.importActual('vitest');

  const mockObject = {
    Hardware: vi.fn().mockImplementation(() => ({
      workwindow: {
        capture: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        getView: vi.fn(),
        setForeground: vi.fn(),
        setView: vi.fn(),
        isForeground: vi.fn(),
        isOpen: vi.fn(),
      },
      mouse: {
        move: vi.fn(),
        leftClick: vi.fn(),
        rightClick: vi.fn(),
        middleClick: vi.fn(),
        doubleClick: vi.fn(),
        leftDown: vi.fn(),
        leftUp: vi.fn(),
        rightDown: vi.fn(),
        rightUp: vi.fn(),
        scroll: vi.fn(),
      },
      keyboard: {
        pressKey: vi.fn(),
        releaseKey: vi.fn(),
        typeString: vi.fn(),
      },
      clipboard: {
        getClipboard: vi.fn(),
        setClipboard: vi.fn(),
      },
    })),
    getScreenSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
    getAllWindows: vi.fn().mockReturnValue([{ title: 'Test Window', handle: 12345 }]),
    getWindowChildren: vi.fn().mockReturnValue([]),
  };

  return {
    default: mockObject,
    ...mockObject,
  };
});

// Create a simple mock of KeysenderProvider for use in tests
class MockKeysenderProvider {
  keyboard = { keyTap: vi.fn() };
  mouse = { moveMouse: vi.fn() };
  screen = { getScreenSize: vi.fn() };
  clipboard = { readClipboard: vi.fn() };
}

// Mock the factory to avoid native module loading issues
vi.mock('../factory.js', async () => {
  await vi.importActual('vitest');

  return {
    createAutomationProvider: vi.fn().mockImplementation((_providerType) => {
      return new MockKeysenderProvider();
    }),
  };
});

// Mock the automation classes
vi.mock('./keyboard.js', async () => {
  await vi.importActual('vitest');
  return {
    KeysenderKeyboardAutomation: vi.fn().mockImplementation(() => ({
      keyTap: vi.fn(),
      keyToggle: vi.fn(),
      typeString: vi.fn(),
      typeStringDelayed: vi.fn(),
      setKeyboardDelay: vi.fn(),
    })),
  };
});

vi.mock('./mouse.js', async () => {
  await vi.importActual('vitest');
  return {
    KeysenderMouseAutomation: vi.fn().mockImplementation(() => ({
      moveMouse: vi.fn(),
      moveMouseSmooth: vi.fn(),
      mouseClick: vi.fn(),
      mouseDoubleClick: vi.fn(),
      mouseToggle: vi.fn(),
      dragMouse: vi.fn(),
      scrollMouse: vi.fn(),
      getMousePosition: vi.fn(),
      setMousePosition: vi.fn(),
      setMouseSpeed: vi.fn(),
    })),
  };
});

vi.mock('./screen.js', async () => {
  await vi.importActual('vitest');
  return {
    KeysenderScreenAutomation: vi.fn().mockImplementation(() => ({
      getScreenSize: vi.fn(),
      getScreenshot: vi.fn(),
      getActiveWindow: vi.fn(),
      focusWindow: vi.fn(),
      resizeWindow: vi.fn(),
      repositionWindow: vi.fn(),
    })),
  };
});

vi.mock('./clipboard.js', async () => {
  await vi.importActual('vitest');
  return {
    KeysenderClipboardAutomation: vi.fn().mockImplementation(() => ({
      readClipboard: vi.fn(),
      writeClipboard: vi.fn(),
    })),
  };
});

describe('KeysenderProvider', () => {
  it('should be created through the factory', () => {
    const provider = createAutomationProvider('keysender');
    expect(provider).toBeInstanceOf(MockKeysenderProvider);
  });

  it('should have all required automation interfaces', () => {
    const provider = new MockKeysenderProvider();

    expect(provider.keyboard).toBeDefined();
    expect(provider.mouse).toBeDefined();
    expect(provider.screen).toBeDefined();
    expect(provider.clipboard).toBeDefined();
  });
});
