import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAutomationProvider, initializeProviders } from './factory.js';
import { registry } from './registry.js';
import { AutomationConfig } from '../config.js';
// These imports are used in test expectations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ClipboardAutomation } from '../interfaces/automation.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ClipboardInput } from '../types/common.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WindowsControlResponse } from '../types/responses.js';

// Mock the individual provider imports
vi.mock('./clipboard/powershell/index.js', () => ({
  PowerShellClipboardProvider: vi.fn().mockImplementation(() => ({
    getClipboardContent: vi.fn().mockResolvedValue({ success: true, data: 'powershell' }),
    setClipboardContent: vi.fn().mockResolvedValue({ success: true }),
    hasClipboardText: vi.fn().mockResolvedValue({ success: true, data: true }),
    clearClipboard: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock('./clipboard/clipboardy/index.js', () => ({
  ClipboardyProvider: vi.fn().mockImplementation(() => ({
    getClipboardContent: vi.fn().mockResolvedValue({ success: true, data: 'clipboardy' }),
    setClipboardContent: vi.fn().mockResolvedValue({ success: true }),
    hasClipboardText: vi.fn().mockResolvedValue({ success: true, data: true }),
    clearClipboard: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock keysender provider to avoid ELF header issue
vi.mock('./keysender/index.js', () => ({
  KeysenderProvider: vi.fn().mockImplementation(() => ({
    keyboard: {
      typeText: vi.fn().mockResolvedValue({ success: true }),
      pressKey: vi.fn().mockResolvedValue({ success: true }),
      pressKeyCombination: vi.fn().mockResolvedValue({ success: true }),
      holdKey: vi.fn().mockResolvedValue({ success: true }),
    },
    mouse: {
      moveMouse: vi.fn().mockResolvedValue({ success: true }),
      clickMouse: vi.fn().mockResolvedValue({ success: true }),
      doubleClick: vi.fn().mockResolvedValue({ success: true }),
      getCursorPosition: vi.fn().mockResolvedValue({ success: true, data: { x: 0, y: 0 } }),
      scrollMouse: vi.fn().mockResolvedValue({ success: true }),
      dragMouse: vi.fn().mockResolvedValue({ success: true }),
      clickAt: vi.fn().mockResolvedValue({ success: true }),
    },
    screen: {
      getScreenSize: vi
        .fn()
        .mockResolvedValue({ success: true, data: { width: 1920, height: 1080 } }),
      getActiveWindow: vi.fn().mockResolvedValue({ success: true, data: {} }),
      focusWindow: vi.fn().mockResolvedValue({ success: true }),
      resizeWindow: vi.fn().mockResolvedValue({ success: true }),
      repositionWindow: vi.fn().mockResolvedValue({ success: true }),
      getScreenshot: vi.fn().mockResolvedValue({
        success: true,
        data: { data: '', format: 'png', width: 1920, height: 1080 },
      }),
    },
    clipboard: {
      getClipboardContent: vi.fn().mockResolvedValue({ success: true, data: '' }),
      setClipboardContent: vi.fn().mockResolvedValue({ success: true }),
      hasClipboardText: vi.fn().mockResolvedValue({ success: true, data: true }),
      clearClipboard: vi.fn().mockResolvedValue({ success: true }),
    },
  })),
}));

describe('Factory with Modular Providers', () => {
  beforeEach(() => {
    // Clear the registry before each test
    const available = registry.getAvailableProviders();
    available.clipboards.forEach(() => {
      // We need to clear the registry, but the interface doesn't provide a clear method
      // This is a limitation we should address
    });
    vi.clearAllMocks();
  });

  describe('initializeProviders', () => {
    it('should register default providers', () => {
      initializeProviders();

      const available = registry.getAvailableProviders();
      expect(available.clipboards).toContain('powershell');
      expect(available.clipboards).toContain('clipboardy');
    });
  });

  describe('createAutomationProvider with modular config', () => {
    it('should create composite provider with specified components', () => {
      const config: AutomationConfig = {
        providers: {
          clipboard: 'powershell',
        },
      };

      const provider = createAutomationProvider(config);

      expect(provider).toBeDefined();
      expect(provider.clipboard).toBeDefined();
      expect(provider.keyboard).toBeDefined();
      expect(provider.mouse).toBeDefined();
      expect(provider.screen).toBeDefined();
    });

    it('should use PowerShell clipboard when specified', async () => {
      const config: AutomationConfig = {
        providers: {
          clipboard: 'powershell',
        },
      };

      const provider = createAutomationProvider(config);
      const result = await provider.clipboard.getClipboardContent();

      expect(result.data).toBe('powershell');
    });

    it('should use clipboardy when specified', async () => {
      const config: AutomationConfig = {
        providers: {
          clipboard: 'clipboardy',
        },
      };

      const provider = createAutomationProvider(config);
      const result = await provider.clipboard.getClipboardContent();

      expect(result.data).toBe('clipboardy');
    });

    it('should fall back to default providers for unspecified components', () => {
      const config: AutomationConfig = {
        providers: {
          clipboard: 'powershell',
          // keyboard, mouse, screen not specified
        },
      };

      const provider = createAutomationProvider(config);

      expect(provider.keyboard).toBeDefined();
      expect(provider.mouse).toBeDefined();
      expect(provider.screen).toBeDefined();
    });

    it('should cache composite providers based on configuration', () => {
      const config: AutomationConfig = {
        providers: {
          clipboard: 'powershell',
        },
      };

      const provider1 = createAutomationProvider(config);
      const provider2 = createAutomationProvider(config);

      expect(provider1).toBe(provider2);
    });

    it('should create different providers for different configurations', () => {
      const config1: AutomationConfig = {
        providers: {
          clipboard: 'powershell',
        },
      };

      const config2: AutomationConfig = {
        providers: {
          clipboard: 'clipboardy',
        },
      };

      const provider1 = createAutomationProvider(config1);
      const provider2 = createAutomationProvider(config2);

      expect(provider1).not.toBe(provider2);
    });
  });

  describe('createAutomationProvider with legacy config', () => {
    it('should create keysender provider by default', () => {
      // Mock keysender provider to avoid ELF header issue
      vi.doMock('./keysender/index.js', () => ({
        KeysenderProvider: vi.fn().mockImplementation(() => ({
          keyboard: {
            typeText: vi.fn(),
            pressKey: vi.fn(),
          },
          mouse: {
            moveMouse: vi.fn(),
            clickMouse: vi.fn(),
          },
          screen: {
            getScreenSize: vi.fn(),
            getActiveWindow: vi.fn(),
          },
          clipboard: {
            getClipboardContent: vi.fn(),
            setClipboardContent: vi.fn(),
          },
        })),
      }));

      const provider = createAutomationProvider();

      expect(provider).toBeDefined();
      expect(provider.keyboard).toBeDefined();
      expect(provider.mouse).toBeDefined();
      expect(provider.screen).toBeDefined();
      expect(provider.clipboard).toBeDefined();
    });

    it('should cache legacy providers', () => {
      const provider1 = createAutomationProvider();
      const provider2 = createAutomationProvider();

      expect(provider1).toBe(provider2);
    });
  });
});
