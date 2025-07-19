import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { NutJSProvider } from './nutjs/index.js';

// Mock the providers
vi.mock('./nutjs/index.js', () => {
  return {
    NutJSProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {},
    })),
  };
});

describe('createAutomationProvider', () => {
  it('should create NutJSProvider by default', () => {
    const provider = createAutomationProvider();
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create NutJSProvider when explicitly specified', () => {
    const provider = createAutomationProvider({ provider: 'nutjs' });
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for NutJSProvider', () => {
    const provider = createAutomationProvider({ provider: 'NuTjS' });
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider({ provider: 'unknown' })).toThrow(
      'Unknown provider type: unknown',
    );
  });
});
