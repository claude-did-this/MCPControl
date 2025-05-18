import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClipboardInput } from '../../../types/common.js';

// Set up mocks at the top level
const execAsyncMock = vi.fn();

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn().mockReturnValue(execAsyncMock),
}));

// Dynamic import to ensure mocks are setup
describe('PowerShellClipboardProvider', () => {
  let PowerShellClipboardProvider: any;
  let provider: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    execAsyncMock.mockReset();

    // Dynamically import after mocks are setup
    const module = await import('./index.js');
    PowerShellClipboardProvider = module.PowerShellClipboardProvider;
    provider = new PowerShellClipboardProvider();
  });

  describe('getClipboardContent', () => {
    it('should get clipboard content successfully', async () => {
      execAsyncMock.mockResolvedValue({ stdout: 'Test content\n', stderr: '' });

      const result = await provider.getClipboardContent();

      expect(result.success).toBe(true);
      expect(result.data).toBe('Test content');
      expect(execAsyncMock).toHaveBeenCalledWith('powershell.exe -Command "Get-Clipboard"');
    });

    it('should handle errors', async () => {
      execAsyncMock.mockRejectedValue(new Error('PowerShell error'));

      const result = await provider.getClipboardContent();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to get clipboard content');
    });

    it('should handle stderr', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: 'Error output' });

      const result = await provider.getClipboardContent();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error output');
    });
  });

  describe('setClipboardContent', () => {
    it('should set clipboard content successfully', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: '' });
      const input: ClipboardInput = { text: 'New content' };

      const result = await provider.setClipboardContent(input);

      expect(result.success).toBe(true);
      expect(execAsyncMock).toHaveBeenCalledWith(
        'powershell.exe -Command "Set-Clipboard -Value "New content""',
      );
    });

    it('should escape quotes in text', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: '' });
      const input: ClipboardInput = { text: 'Text with "quotes"' };

      await provider.setClipboardContent(input);

      expect(execAsyncMock).toHaveBeenCalledWith(
        'powershell.exe -Command "Set-Clipboard -Value "Text with `"quotes`"""',
      );
    });

    it('should handle errors', async () => {
      execAsyncMock.mockRejectedValue(new Error('PowerShell error'));

      const input: ClipboardInput = { text: 'Test' };
      const result = await provider.setClipboardContent(input);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to set clipboard content');
    });
  });

  describe('hasClipboardText', () => {
    it('should return true when clipboard has text', async () => {
      execAsyncMock.mockResolvedValue({ stdout: 'Some text\n', stderr: '' });

      const result = await provider.hasClipboardText();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when clipboard is empty', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '\n', stderr: '' });

      const result = await provider.hasClipboardText();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return false when clipboard is empty string', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await provider.hasClipboardText();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('clearClipboard', () => {
    it('should clear clipboard successfully', async () => {
      execAsyncMock.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await provider.clearClipboard();

      expect(result.success).toBe(true);
      expect(execAsyncMock).toHaveBeenCalledWith(
        'powershell.exe -Command "Set-Clipboard -Value """',
      );
    });

    it('should handle errors in clearClipboard', async () => {
      execAsyncMock.mockRejectedValue(new Error('PowerShell error'));

      const result = await provider.clearClipboard();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to clear clipboard');
    });
  });
});
