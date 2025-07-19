import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NutJSClipboardAutomation } from './clipboard.js';
import clipboardy from 'clipboardy';

// Mock clipboardy
vi.mock('clipboardy', () => {
  return {
    default: {
      read: vi.fn(),
      write: vi.fn(),
    },
  };
});

describe('NutJSClipboardAutomation', () => {
  let clipboardAutomation: NutJSClipboardAutomation;

  beforeEach(() => {
    clipboardAutomation = new NutJSClipboardAutomation();
    // Reset mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getClipboardContent', () => {
    it('should return clipboard content when successful', async () => {
      // Arrange
      const testContent = 'test clipboard content';
      vi.mocked(clipboardy.read).mockResolvedValue(testContent);

      // Act
      const result = await clipboardAutomation.getClipboardContent();

      // Assert
      expect(clipboardy.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Clipboard content retrieved',
        data: testContent,
      });
    });

    it('should handle errors when getting clipboard content fails', async () => {
      // Arrange
      const error = new Error('Failed to access clipboard');
      vi.mocked(clipboardy.read).mockRejectedValue(error);

      // Act
      const result = await clipboardAutomation.getClipboardContent();

      // Assert
      expect(clipboardy.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: `Failed to get clipboard content: ${error.message}`,
      });
    });
  });

  describe('setClipboardContent', () => {
    it('should set clipboard content when successful', async () => {
      // Arrange
      const testInput = { text: 'new clipboard content' };
      vi.mocked(clipboardy.write).mockResolvedValue(undefined);

      // Act
      const result = await clipboardAutomation.setClipboardContent(testInput);

      // Assert
      expect(clipboardy.write).toHaveBeenCalledTimes(1);
      expect(clipboardy.write).toHaveBeenCalledWith(testInput.text);
      expect(result).toEqual({
        success: true,
        message: 'Clipboard content set',
      });
    });

    it('should handle errors when setting clipboard content fails', async () => {
      // Arrange
      const testInput = { text: 'new clipboard content' };
      const error = new Error('Failed to write to clipboard');
      vi.mocked(clipboardy.write).mockRejectedValue(error);

      // Act
      const result = await clipboardAutomation.setClipboardContent(testInput);

      // Assert
      expect(clipboardy.write).toHaveBeenCalledTimes(1);
      expect(clipboardy.write).toHaveBeenCalledWith(testInput.text);
      expect(result).toEqual({
        success: false,
        message: `Failed to set clipboard content: ${error.message}`,
      });
    });
  });

  describe('hasClipboardText', () => {
    it('should return true when clipboard has text', async () => {
      // Arrange
      vi.mocked(clipboardy.read).mockResolvedValue('some text');

      // Act
      const result = await clipboardAutomation.hasClipboardText();

      // Assert
      expect(clipboardy.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Clipboard has text',
        data: true,
      });
    });

    it('should return false when clipboard is empty', async () => {
      // Arrange
      vi.mocked(clipboardy.read).mockResolvedValue('');

      // Act
      const result = await clipboardAutomation.hasClipboardText();

      // Assert
      expect(clipboardy.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'Clipboard does not have text',
        data: false,
      });
    });

    it('should handle errors when checking clipboard fails', async () => {
      // Arrange
      const error = new Error('Failed to access clipboard');
      vi.mocked(clipboardy.read).mockRejectedValue(error);

      // Act
      const result = await clipboardAutomation.hasClipboardText();

      // Assert
      expect(clipboardy.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: `Failed to check clipboard: ${error.message}`,
      });
    });
  });

  describe('clearClipboard', () => {
    it('should clear clipboard when successful', async () => {
      // Arrange
      vi.mocked(clipboardy.write).mockResolvedValue(undefined);

      // Act
      const result = await clipboardAutomation.clearClipboard();

      // Assert
      expect(clipboardy.write).toHaveBeenCalledTimes(1);
      expect(clipboardy.write).toHaveBeenCalledWith('');
      expect(result).toEqual({
        success: true,
        message: 'Clipboard cleared',
      });
    });

    it('should handle errors when clearing clipboard fails', async () => {
      // Arrange
      const error = new Error('Failed to write to clipboard');
      vi.mocked(clipboardy.write).mockRejectedValue(error);

      // Act
      const result = await clipboardAutomation.clearClipboard();

      // Assert
      expect(clipboardy.write).toHaveBeenCalledTimes(1);
      expect(clipboardy.write).toHaveBeenCalledWith('');
      expect(result).toEqual({
        success: false,
        message: `Failed to clear clipboard: ${error.message}`,
      });
    });
  });
});
