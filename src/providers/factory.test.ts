import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { KeysenderProvider } from './keysender/index.js';

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

describe('createAutomationProvider', () => {
  it('should create KeysenderProvider by default', () => {
    const provider = createAutomationProvider();
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create KeysenderProvider when explicitly specified', () => {
    const provider = createAutomationProvider({ provider: 'keysender' });
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for KeysenderProvider', () => {
    const provider = createAutomationProvider({ provider: 'KeYsEnDeR' });
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider({ provider: 'unknown' })).toThrow(
      'Unknown provider type: unknown',
    );
  });
});
