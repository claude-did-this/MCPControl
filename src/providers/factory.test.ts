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
  it('should create NutJSProvider by default', async () => {
    const provider = await createAutomationProvider();
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create NutJSProvider when explicitly specified', async () => {
    const provider = await createAutomationProvider('nutjs');
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create KeysenderProvider when specified', async () => {
    const provider = await createAutomationProvider('keysender');
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive when creating provider', async () => {
    const provider = await createAutomationProvider('NuTjS');
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for KeysenderProvider', async () => {
    const provider = await createAutomationProvider('KeYsEnDeR');
    expect(KeysenderProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', async () => {
    await expect(createAutomationProvider('unknown')).rejects.toThrow('Unknown provider type: unknown');
  });
});