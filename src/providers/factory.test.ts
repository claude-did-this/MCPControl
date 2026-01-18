import { describe, it, expect, vi } from 'vitest';
import { createAutomationProvider } from './factory.js';
import { RobotJSProvider } from './robotjs/index.js';

// Mock the providers
vi.mock('./robotjs/index.js', () => {
  return {
    RobotJSProvider: vi.fn().mockImplementation(() => ({
      keyboard: {},
      mouse: {},
      screen: {},
      clipboard: {},
    })),
  };
});

describe('createAutomationProvider', () => {
  it('should create RobotJSProvider by default', () => {
    const provider = createAutomationProvider();
    expect(RobotJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should create RobotJSProvider when explicitly specified', () => {
    const provider = createAutomationProvider({ provider: 'robotjs' });
    expect(RobotJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for RobotJSProvider', () => {
    const provider = createAutomationProvider({ provider: 'RoBoTjS' });
    expect(RobotJSProvider).toHaveBeenCalled();
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider({ provider: 'unknown' })).toThrow(
      'Unknown provider type: unknown',
    );
  });
});
