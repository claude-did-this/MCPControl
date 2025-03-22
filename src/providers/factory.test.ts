import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { NutJSProvider } from './nutjs/index.js';
import { KeysenderProvider } from './keysender/index.js';

// Mock the providers
vi.mock('./nutjs/index.js', () => {
  return {
    NutJSProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {}
    }))
  };
});

vi.mock('./keysender/index.js', () => {
  return {
    KeysenderProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {}
    }))
  };
});

describe('createAutomationProvider', () => {
  it('should create NutJSProvider by default', () => {
    const provider = createAutomationProvider();
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create NutJSProvider when explicitly specified', () => {
    const provider = createAutomationProvider('nutjs');
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create KeysenderProvider when specified', () => {
    const provider = createAutomationProvider('keysender');
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive when creating provider', () => {
    const provider = createAutomationProvider('NuTjS');
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for KeysenderProvider', () => {
    const provider = createAutomationProvider('KeYsEnDeR');
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider('unknown')).toThrow('Unknown provider type: unknown');
  });
});