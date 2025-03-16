import { describe, it, expect } from 'vitest';
import { createAutomationProvider } from '../factory.js';
import { KeysenderProvider } from './index.js';

describe('KeysenderProvider', () => {
  it('should be created through the factory', () => {
    const provider = createAutomationProvider('keysender');
    expect(provider).toBeInstanceOf(KeysenderProvider);
  });

  it('should have all required automation interfaces', () => {
    const provider = new KeysenderProvider();
    
    expect(provider.keyboard).toBeDefined();
    expect(provider.mouse).toBeDefined();
    expect(provider.screen).toBeDefined();
    expect(provider.clipboard).toBeDefined();
  });
});
