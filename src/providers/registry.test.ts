import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultProviderRegistry } from './registry.js';
import { ClipboardAutomation } from '../interfaces/automation.js';
import { ClipboardInput } from '../types/common.js';
import { WindowsControlResponse } from '../types/responses.js';

class MockClipboardProvider implements ClipboardAutomation {
  // eslint-disable-next-line @typescript-eslint/require-await
  async getClipboardContent(): Promise<WindowsControlResponse> {
    return { success: true, message: 'Mock clipboard content', data: 'test' };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async setClipboardContent(_input: ClipboardInput): Promise<WindowsControlResponse> {
    return { success: true, message: 'Mock set clipboard' };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async hasClipboardText(): Promise<WindowsControlResponse> {
    return { success: true, message: 'Mock has text', data: true };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async clearClipboard(): Promise<WindowsControlResponse> {
    return { success: true, message: 'Mock clear clipboard' };
  }
}

describe('DefaultProviderRegistry', () => {
  let registry: DefaultProviderRegistry;

  beforeEach(() => {
    registry = new DefaultProviderRegistry();
  });

  describe('registration', () => {
    it('should register and retrieve clipboard provider', () => {
      const provider = new MockClipboardProvider();
      registry.registerClipboard('mock', provider);

      const retrieved = registry.getClipboard('mock');
      expect(retrieved).toBe(provider);
    });

    it('should return undefined for non-existent provider', () => {
      const retrieved = registry.getClipboard('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should allow overwriting existing provider', () => {
      const provider1 = new MockClipboardProvider();
      const provider2 = new MockClipboardProvider();

      registry.registerClipboard('mock', provider1);
      registry.registerClipboard('mock', provider2);

      const retrieved = registry.getClipboard('mock');
      expect(retrieved).toBe(provider2);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return empty arrays initially', () => {
      const available = registry.getAvailableProviders();

      expect(available.keyboards).toEqual([]);
      expect(available.mice).toEqual([]);
      expect(available.screens).toEqual([]);
      expect(available.clipboards).toEqual([]);
    });

    it('should return registered provider names', () => {
      registry.registerClipboard('provider1', new MockClipboardProvider());
      registry.registerClipboard('provider2', new MockClipboardProvider());

      const available = registry.getAvailableProviders();

      expect(available.clipboards).toContain('provider1');
      expect(available.clipboards).toContain('provider2');
      expect(available.clipboards.length).toBe(2);
    });
  });
});
