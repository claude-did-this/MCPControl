import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAutomationProvider } from './factory.js';
import * as configModule from '../config.js';

// Mock isWindows to control platform detection in tests
vi.mock('../config.js', async () => {
  const actual = await vi.importActual('../config.js');
  return {
    ...actual,
    isWindows: vi.fn().mockReturnValue(false),
    getDefaultProvider: vi.fn().mockReturnValue('clipboardy'),
  };
});

// Mock the clipboard provider
vi.mock('./clipboard/clipboardy/index.js', () => ({
  ClipboardyProvider: vi.fn().mockImplementation(() => ({
    getClipboardContent: vi.fn().mockResolvedValue({ success: true, data: 'clipboardy' }),
    setClipboardContent: vi.fn().mockResolvedValue({ success: true }),
    hasClipboardText: vi.fn().mockResolvedValue({ success: true, data: true }),
    clearClipboard: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

describe('createAutomationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create DummyProvider when keysender is requested on non-Windows', () => {
    const provider = createAutomationProvider({ provider: 'keysender' });
    expect(configModule.isWindows).toHaveBeenCalled();
    expect(provider).toBeDefined();
    // Provider should have been created with dummy implementations
    expect(provider.keyboard.typeText({text: "test"}).success).toBe(false);
  });

  it('should create clipboardy provider by default on non-Windows', () => {
    // Force getDefaultProvider to return a value for testing
    vi.mocked(configModule.getDefaultProvider).mockReturnValue('clipboardy');
    
    const provider = createAutomationProvider();
    // Check that the provider was created successfully
    expect(provider).toBeDefined();
  });

  it('should be case insensitive for provider names', () => {
    const provider = createAutomationProvider({ provider: 'ClIpBoArDy' });
    expect(provider).toBeDefined();
  });

  it('should throw error for unknown provider type', () => {
    expect(() => createAutomationProvider({ provider: 'unknown' })).toThrow(
      'Unknown provider type: unknown',
    );
  });
});
