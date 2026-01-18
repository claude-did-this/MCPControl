import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoHotkeyProvider } from './index.js';

// Mock child_process module properly
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
  spawn: vi.fn(),
  fork: vi.fn(),
  execFile: vi.fn(),
}));

describe('AutoHotkeyProvider', () => {
  let provider: AutoHotkeyProvider;

  beforeEach(() => {
    provider = new AutoHotkeyProvider();
  });

  it('should create an instance with all required automation interfaces', () => {
    expect(provider).toBeDefined();
    expect(provider.keyboard).toBeDefined();
    expect(provider.mouse).toBeDefined();
    expect(provider.screen).toBeDefined();
    expect(provider.clipboard).toBeDefined();
  });

  it('should implement KeyboardAutomation interface', () => {
    expect(provider.keyboard).toBeDefined();
    expect(provider.keyboard.typeText).toBeDefined();
    expect(provider.keyboard.pressKey).toBeDefined();
    expect(provider.keyboard.pressKeyCombination).toBeDefined();
    expect(provider.keyboard.holdKey).toBeDefined();
  });

  it('should implement MouseAutomation interface', () => {
    expect(provider.mouse).toBeDefined();
    expect(provider.mouse.moveMouse).toBeDefined();
    expect(provider.mouse.clickMouse).toBeDefined();
    expect(provider.mouse.doubleClick).toBeDefined();
    expect(provider.mouse.getCursorPosition).toBeDefined();
    expect(provider.mouse.scrollMouse).toBeDefined();
    expect(provider.mouse.dragMouse).toBeDefined();
    expect(provider.mouse.clickAt).toBeDefined();
  });

  it('should implement ScreenAutomation interface', () => {
    expect(provider.screen).toBeDefined();
    expect(provider.screen.getScreenSize).toBeDefined();
    expect(provider.screen.getActiveWindow).toBeDefined();
    expect(provider.screen.focusWindow).toBeDefined();
    expect(provider.screen.resizeWindow).toBeDefined();
    expect(provider.screen.repositionWindow).toBeDefined();
    expect(provider.screen.getScreenshot).toBeDefined();
  });

  it('should implement ClipboardAutomation interface', () => {
    expect(provider.clipboard).toBeDefined();
    expect(provider.clipboard.getClipboardContent).toBeDefined();
    expect(provider.clipboard.setClipboardContent).toBeDefined();
    expect(provider.clipboard.hasClipboardText).toBeDefined();
    expect(provider.clipboard.clearClipboard).toBeDefined();
  });
});

describe('AutoHotkeyProvider - Factory Integration', () => {
  beforeEach(() => {
    // Mock the factory module
    vi.doMock('../factory.js', () => ({
      createAutomationProvider: vi.fn().mockImplementation((config: any) => {
        if (config?.provider === 'autohotkey' || config?.providers) {
          return new AutoHotkeyProvider();
        }
        return {};
      }),
    }));
  });

  it('should be available through the factory', async () => {
    const { createAutomationProvider } = await import('../factory.js');

    const provider = createAutomationProvider({ provider: 'autohotkey' });
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(AutoHotkeyProvider);
  });

  it('should support modular configuration', async () => {
    const { createAutomationProvider } = await import('../factory.js');

    const provider = createAutomationProvider({
      providers: {
        keyboard: 'autohotkey',
        mouse: 'autohotkey',
        screen: 'autohotkey',
        clipboard: 'autohotkey',
      },
    });

    expect(provider).toBeDefined();
    expect(provider.keyboard).toBeDefined();
    expect(provider.mouse).toBeDefined();
    expect(provider.screen).toBeDefined();
    expect(provider.clipboard).toBeDefined();
  });
});
