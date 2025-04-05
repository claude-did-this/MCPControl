import { describe, it, expect } from 'vitest';
import {
  MousePositionSchema,
  MouseButtonSchema,
  KeySchema,
  KeyCombinationSchema,
  KeyHoldOperationSchema,
  ScrollAmountSchema,
  ClipboardInputSchema,
  ScreenshotOptionsSchema
} from './validation.zod.js';
import { MAX_ALLOWED_COORDINATE, MAX_SCROLL_AMOUNT } from './validation.js';

describe('Zod Validation Schemas', () => {
  describe('MousePositionSchema', () => {
    it('should validate valid mouse positions', () => {
      expect(() => MousePositionSchema.parse({ x: 100, y: 200 })).not.toThrow();
      expect(() => MousePositionSchema.parse({ x: -100, y: -200 })).not.toThrow();
      expect(() => MousePositionSchema.parse({ x: 0, y: 0 })).not.toThrow();
      expect(() => MousePositionSchema.parse({ x: MAX_ALLOWED_COORDINATE, y: MAX_ALLOWED_COORDINATE })).not.toThrow();
      expect(() => MousePositionSchema.parse({ x: -MAX_ALLOWED_COORDINATE, y: -MAX_ALLOWED_COORDINATE })).not.toThrow();
    });

    it('should reject invalid mouse positions', () => {
      expect(() => MousePositionSchema.parse({ x: 'invalid', y: 200 })).toThrow();
      expect(() => MousePositionSchema.parse({ x: 100, y: NaN })).toThrow();
      expect(() => MousePositionSchema.parse({ x: MAX_ALLOWED_COORDINATE + 1, y: 200 })).toThrow();
      expect(() => MousePositionSchema.parse({ x: 100, y: -MAX_ALLOWED_COORDINATE - 1 })).toThrow();
      expect(() => MousePositionSchema.parse({ x: 100 })).toThrow();
      expect(() => MousePositionSchema.parse({ y: 200 })).toThrow();
      expect(() => MousePositionSchema.parse({})).toThrow();
      expect(() => MousePositionSchema.parse(null)).toThrow();
    });
  });

  describe('MouseButtonSchema', () => {
    it('should validate valid mouse buttons', () => {
      expect(() => MouseButtonSchema.parse('left')).not.toThrow();
      expect(() => MouseButtonSchema.parse('right')).not.toThrow();
      expect(() => MouseButtonSchema.parse('middle')).not.toThrow();
    });

    it('should reject invalid mouse buttons', () => {
      expect(() => MouseButtonSchema.parse('invalid')).toThrow();
      expect(() => MouseButtonSchema.parse('')).toThrow();
      expect(() => MouseButtonSchema.parse(null)).toThrow();
      expect(() => MouseButtonSchema.parse(undefined)).toThrow();
    });
  });

  describe('KeySchema', () => {
    it('should validate valid keys', () => {
      expect(() => KeySchema.parse('a')).not.toThrow();
      expect(() => KeySchema.parse('enter')).not.toThrow();
      expect(() => KeySchema.parse('space')).not.toThrow();
      expect(() => KeySchema.parse('F1')).not.toThrow(); // Should normalize case
    });

    it('should reject invalid keys', () => {
      expect(() => KeySchema.parse('invalid_key')).toThrow();
      expect(() => KeySchema.parse('')).toThrow();
      expect(() => KeySchema.parse(null)).toThrow();
      expect(() => KeySchema.parse(undefined)).toThrow();
    });
  });

  describe('KeyCombinationSchema', () => {
    it('should validate valid key combinations', () => {
      expect(() => KeyCombinationSchema.parse({ keys: ['control', 'c'] })).not.toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: ['control', 'shift', 'a'] })).not.toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: ['a'] })).not.toThrow();
    });

    it('should reject invalid key combinations', () => {
      expect(() => KeyCombinationSchema.parse({ keys: [] })).toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: ['control', 'alt', 'delete'] })).toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: ['a', 'b', 'c', 'd', 'e', 'f'] })).toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: ['invalid_key'] })).toThrow();
      expect(() => KeyCombinationSchema.parse({ keys: 'control+c' })).toThrow();
      expect(() => KeyCombinationSchema.parse({})).toThrow();
    });
  });

  describe('KeyHoldOperationSchema', () => {
    it('should validate valid key hold operations', () => {
      expect(() => KeyHoldOperationSchema.parse({ key: 'shift', state: 'down', duration: 1000 })).not.toThrow();
      expect(() => KeyHoldOperationSchema.parse({ key: 'a', state: 'up' })).not.toThrow();
    });

    it('should reject invalid key hold operations', () => {
      expect(() => KeyHoldOperationSchema.parse({ key: 'shift', state: 'down' })).toThrow();
      expect(() => KeyHoldOperationSchema.parse({ key: 'invalid', state: 'down', duration: 1000 })).toThrow();
      expect(() => KeyHoldOperationSchema.parse({ key: 'shift', state: 'invalid', duration: 1000 })).toThrow();
      expect(() => KeyHoldOperationSchema.parse({ key: 'shift', state: 'down', duration: 5 })).toThrow();
      expect(() => KeyHoldOperationSchema.parse({ key: 'shift', state: 'down', duration: 20000 })).toThrow();
      expect(() => KeyHoldOperationSchema.parse({})).toThrow();
    });
  });

  describe('ScrollAmountSchema', () => {
    it('should validate valid scroll amounts', () => {
      expect(() => ScrollAmountSchema.parse(100)).not.toThrow();
      expect(() => ScrollAmountSchema.parse(-100)).not.toThrow();
      expect(() => ScrollAmountSchema.parse(0)).not.toThrow();
      expect(() => ScrollAmountSchema.parse(MAX_SCROLL_AMOUNT)).not.toThrow();
      expect(() => ScrollAmountSchema.parse(-MAX_SCROLL_AMOUNT)).not.toThrow();
    });

    it('should reject invalid scroll amounts', () => {
      expect(() => ScrollAmountSchema.parse(MAX_SCROLL_AMOUNT + 1)).toThrow();
      expect(() => ScrollAmountSchema.parse(-MAX_SCROLL_AMOUNT - 1)).toThrow();
      expect(() => ScrollAmountSchema.parse(NaN)).toThrow();
      expect(() => ScrollAmountSchema.parse('100')).toThrow();
      expect(() => ScrollAmountSchema.parse(null)).toThrow();
      expect(() => ScrollAmountSchema.parse(undefined)).toThrow();
    });
  });

  describe('ClipboardInputSchema', () => {
    it('should validate valid clipboard inputs', () => {
      expect(() => ClipboardInputSchema.parse({ text: 'Test clipboard content' })).not.toThrow();
      expect(() => ClipboardInputSchema.parse({ text: '' })).not.toThrow();
    });

    it('should reject invalid clipboard inputs', () => {
      const longText = 'a'.repeat(10000);
      expect(() => ClipboardInputSchema.parse({ text: longText })).toThrow();
      expect(() => ClipboardInputSchema.parse({ text: 123 })).toThrow();
      expect(() => ClipboardInputSchema.parse({})).toThrow();
      expect(() => ClipboardInputSchema.parse({ other: 'value' })).toThrow();
    });
  });

  describe('ScreenshotOptionsSchema', () => {
    it('should validate valid screenshot options', () => {
      expect(() => ScreenshotOptionsSchema.parse({
        region: { x: 100, y: 100, width: 500, height: 500 },
        format: 'jpeg',
        quality: 90,
        grayscale: true,
        resize: { width: 1280, fit: 'contain' }
      })).not.toThrow();

      expect(() => ScreenshotOptionsSchema.parse({
        format: 'png',
        compressionLevel: 6
      })).not.toThrow();

      expect(() => ScreenshotOptionsSchema.parse({})).not.toThrow();
    });

    it('should reject invalid screenshot options', () => {
      expect(() => ScreenshotOptionsSchema.parse({
        region: { x: 100, y: 100, width: -500, height: 500 }
      })).toThrow();

      expect(() => ScreenshotOptionsSchema.parse({
        quality: 101
      })).toThrow();

      expect(() => ScreenshotOptionsSchema.parse({
        format: 'gif'
      })).toThrow();

      expect(() => ScreenshotOptionsSchema.parse({
        resize: { width: -100, fit: 'invalid' }
      })).toThrow();
    });
  });
});