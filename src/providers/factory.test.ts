import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { KeysenderProvider } from './keysender/index.js';
import { AutoHotkeyProvider } from './autohotkey/index.js';

// Mock the providers
vi.mock('./keysender/index.js', () => {
  return {
    KeysenderProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {},
    })),
  };
});

vi.mock('./autohotkey/index.js', () => {
  return {
    AutoHotkeyProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {},
    })),
  };
});

describe('createAutomationProvider', () => {
  it('should create AutoHotkeyProvider by default', () => {
    const provider = createAutomationProvider();
    expect(AutoHotkeyProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create KeysenderProvider when explicitly specified', () => {
    const provider = createAutomationProvider({ provider: 'keysender' });
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create AutoHotkeyProvider when explicitly specified', () => {
    const provider = createAutomationProvider({ provider: 'autohotkey' });
    expect(AutoHotkeyProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for KeysenderProvider', () => {
    const provider = createAutomationProvider({ provider: 'KeYsEnDeR' });
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for AutoHotkeyProvider', () => {
    const provider = createAutomationProvider({ provider: 'AuToHoTkEy' });
    expect(AutoHotkeyProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider({ provider: 'unknown' })).toThrow(
      'Unknown provider type: unknown',
    );
  });
});
