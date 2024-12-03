import clipboardy from "clipboardy";
import { ClipboardInput } from "../types/common.js";

export async function getClipboardContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const content = await clipboardy.read();
    return {
      success: true,
      content
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function setClipboardContent(input: ClipboardInput): Promise<{ success: boolean; error?: string }> {
  try {
    await clipboardy.write(input.text);
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function hasClipboardText(): Promise<{ success: boolean; hasText?: boolean; error?: string }> {
  try {
    const content = await clipboardy.read();
    return {
      success: true,
      hasText: content.length > 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function clearClipboard(): Promise<{ success: boolean; error?: string }> {
  try {
    await clipboardy.write('');
    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
