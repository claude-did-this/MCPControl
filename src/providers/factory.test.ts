import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { NutJSProvider } from './nutjs/index.js';

// Mock the NutJSProvider
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

  it('should be case insensitive when creating provider', () => {
    const provider = createAutomationProvider('NuTjS');
    expect(NutJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider('unknown')).toThrow('Unknown provider type: unknown');
  });
});