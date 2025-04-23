import pkg from 'keysender';
const { Hardware } = pkg;

// Define keyboard button type directly
type KeyboardButtonType = string;
import {
  KeyboardInput,
  KeyCombination,
  KeyHoldOperation,
  KeyboardStreamOptions,
} from '../../types/common.js';
import { WindowsControlResponse } from '../../types/responses.js';
import { KeyboardAutomation } from '../../interfaces/automation.js';
import {
  MAX_TEXT_LENGTH,
  KeySchema,
  KeyCombinationSchema,
  KeyHoldOperationSchema,
} from '../../tools/validation.zod.js';

/**
 * Keysender implementation of the KeyboardAutomation interface
 */
export class KeysenderKeyboardAutomation implements KeyboardAutomation {
  private keyboard = new Hardware().keyboard;

  /**
   * Types text with human-like timing and provides streaming progress updates
   *
   * This implementation:
   * 1. Uses configurable delays between keypresses
   * 2. Adds natural timing variations if randomize is enabled
   * 3. Adds extra pauses after punctuation
   * 4. Handles very long inputs by chunking the text
   * 5. Provides detailed progress updates for each character
   *
   * @param input Text and typing configuration
   * @returns AsyncGenerator that yields typing progress updates
   */
  async *typeTextStream(
    input: KeyboardInput & KeyboardStreamOptions,
  ): AsyncGenerator<WindowsControlResponse> {
    try {
      // Validate text
      if (!input.text) {
        throw new Error('Text is required');
      }

      if (input.text.length > MAX_TEXT_LENGTH) {
        throw new Error(`Text too long: ${input.text.length} characters (max ${MAX_TEXT_LENGTH})`);
      }

      // Default options
      const delay = input.delay ?? 50; // Default typing delay
      const randomize = input.randomize ?? true; // Default to adding variation
      const randomFactor = input.randomFactor ?? 0.3; // Default randomization factor
      const chunkSize = input.chunkSize ?? 1000; // Default chunk size for very long text

      // Split text into chunks to handle very long inputs more efficiently
      const fullText = input.text;
      const totalLength = fullText.length;
      const chunksNeeded = Math.ceil(totalLength / chunkSize);
      const isMultiChunk = chunksNeeded > 1;

      // Initial response
      yield {
        success: true,
        message: isMultiChunk
          ? `Starting human-like typing (${chunksNeeded} chunks)...`
          : 'Starting human-like typing...',
        stream: true,
        streamInfo: {
          progress: 0,
          isComplete: false,
          currentStep: 0,
          totalSteps: totalLength,
          currentChunk: isMultiChunk ? 1 : undefined,
          totalChunks: isMultiChunk ? chunksNeeded : undefined,
        },
      };

      let overallProgress = 0;
      let typedText = '';

      // Process text in chunks to prevent memory issues with very large inputs
      for (let chunkIndex = 0; chunkIndex < chunksNeeded; chunkIndex++) {
        // Extract current chunk
        const chunkStart = chunkIndex * chunkSize;
        const chunkEnd = Math.min(chunkStart + chunkSize, totalLength);
        const chunk = fullText.substring(chunkStart, chunkEnd);
        const characters = chunk.split('');

        // Type each character in the current chunk with a delay
        for (let i = 0; i < characters.length; i++) {
          const char = characters[i];
          const globalCharIndex = chunkStart + i;

          // Calculate overall progress percentage (across all chunks)
          overallProgress = Math.round(((globalCharIndex + 1) / totalLength) * 100);

          // Add character to ongoing text
          typedText += char;

          // Type the current character
          try {
            await this.keyboard.sendKey(char);
          } catch (charError) {
            console.error(`Error typing character '${char}':`, charError);
            // Try to continue with next character
          }

          // Skip response updates for every character for very long text
          // Only report progress periodically to reduce overhead
          const shouldReportProgress =
            i === 0 || // First character in chunk
            i === characters.length - 1 || // Last character in chunk
            i % Math.max(1, Math.floor(characters.length / 20)) === 0; // ~20 updates per chunk

          if (shouldReportProgress) {
            // Create streaming response
            const response: WindowsControlResponse = {
              success: true,
              message: isMultiChunk
                ? `Typing chunk ${chunkIndex + 1}/${chunksNeeded}, character ${i + 1}/${characters.length}`
                : `Typing character ${globalCharIndex + 1}/${totalLength}`,
              data: {
                currentCharacter: char,
                typedSoFar: typedText.length <= 100 ? typedText : typedText.slice(-100), // Limit data size
                charactersTyped: globalCharIndex + 1,
                remainingCharacters: totalLength - globalCharIndex - 1,
              },
              stream: true,
              streamInfo: {
                progress: overallProgress,
                isComplete: globalCharIndex === totalLength - 1,
                currentStep: globalCharIndex + 1,
                totalSteps: totalLength,
                currentChunk: isMultiChunk ? chunkIndex + 1 : undefined,
                totalChunks: isMultiChunk ? chunksNeeded : undefined,
              },
            };

            yield response;
          }

          // Skip delay for the last character
          if (globalCharIndex < totalLength - 1) {
            // Calculate delay with human-like variation if randomize is enabled
            let typingDelay = delay;
            if (randomize) {
              const variation = delay * randomFactor;
              typingDelay = delay + (Math.random() * variation * 2 - variation);
            }

            // Add extra delay for certain punctuation
            if (['.', '!', '?', ',', ';', ':'].includes(char)) {
              typingDelay += delay * 2;
            }

            // Add slight pause at end of words
            if (char === ' ') {
              typingDelay += delay * 0.5;
            }

            // Wait before typing the next character
            await new Promise((resolve) => setTimeout(resolve, typingDelay));
          }
        }

        // Small pause between chunks if multiple chunks
        if (isMultiChunk && chunkIndex < chunksNeeded - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * 3));
        }
      }

      // Final success response
      return {
        success: true,
        message: isMultiChunk
          ? `Completed typing ${totalLength} characters in ${chunksNeeded} chunks with human-like timing`
          : 'Text typed successfully with human-like timing',
        data: {
          textLength: fullText.length,
          chunks: isMultiChunk ? chunksNeeded : 1,
        },
        stream: true,
        streamInfo: {
          progress: 100,
          isComplete: true,
          currentStep: totalLength,
          totalSteps: totalLength,
          currentChunk: isMultiChunk ? chunksNeeded : undefined,
          totalChunks: isMultiChunk ? chunksNeeded : undefined,
        },
      };
    } catch (error) {
      // Error response
      return {
        success: false,
        message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`,
        stream: true,
        streamInfo: {
          progress: 0,
          isComplete: true,
        },
      };
    }
  }

  typeText(input: KeyboardInput): WindowsControlResponse {
    try {
      // Validate text
      if (!input.text) {
        throw new Error('Text is required');
      }

      if (input.text.length > MAX_TEXT_LENGTH) {
        throw new Error(`Text too long: ${input.text.length} characters (max ${MAX_TEXT_LENGTH})`);
      }

      // Start the asynchronous operation and handle errors properly
      this.keyboard.printText(input.text).catch((err) => {
        console.error('Error typing text:', err);
        // We can't update the response after it's returned, but at least log the error
      });

      return {
        success: true,
        message: `Typed text successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to type text: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  pressKey(key: string): WindowsControlResponse {
    try {
      // Validate the key using Zod schema
      KeySchema.parse(key);
      const keyboardKey = key;

      // Start the asynchronous operation and handle errors properly
      this.keyboard.sendKey(keyboardKey).catch((err) => {
        console.error(`Error pressing key ${key}:`, err);
        // We can't update the response after it's returned, but at least log the error
      });

      return {
        success: true,
        message: `Pressed key: ${key}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to press key: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async pressKeyCombination(combination: KeyCombination): Promise<WindowsControlResponse> {
    try {
      // Validate the key combination using Zod schema
      KeyCombinationSchema.parse(combination);

      // Store original keys for the message
      const keysForMessage = [...combination.keys];

      // Additional safety check: Block ALL Ctrl combinations at implementation level
      // This prevents server crashes that could occur even if validation passes
      if (combination.keys.some((k) => k.toLowerCase() === 'control')) {
        return {
          success: false,
          message: 'Control key combinations are temporarily disabled due to stability issues',
        };
      }

      const pressPromises: Promise<void>[] = [];

      // Validate each key and collect press promises
      const validatedKeys: KeyboardButtonType[] = [];
      for (const key of combination.keys) {
        KeySchema.parse(key);
        const keyboardKey = key;
        validatedKeys.push(keyboardKey);

        // Collect all promises to handle them properly
        pressPromises.push(
          this.keyboard.toggleKey(keyboardKey, true).catch((err) => {
            console.error(`Error pressing key ${key}:`, err);
            throw err; // Re-throw to be caught by the outer try/catch
          }),
        );
      }

      // Wait for all keys to be pressed
      await Promise.all(pressPromises);

      // Small delay to ensure all keys are pressed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Release all keys in reverse order
      const releasePromises: Promise<void>[] = [];
      for (let i = validatedKeys.length - 1; i >= 0; i--) {
        const keyboardKey = validatedKeys[i];
        const originalKey = combination.keys[i];

        releasePromises.push(
          this.keyboard.toggleKey(keyboardKey, false).catch((err) => {
            console.error(`Error releasing key ${originalKey}:`, err);
            throw err; // Re-throw to be caught by the outer try/catch
          }),
        );
      }

      // Wait for all keys to be released
      await Promise.all(releasePromises);

      return {
        success: true,
        message: `Pressed key combination: ${keysForMessage.join('+')}`,
      };
    } catch (error) {
      // Ensure all keys are released in case of error
      try {
        const cleanupPromises: Promise<void>[] = [];
        for (const key of combination.keys) {
          try {
            KeySchema.parse(key);
            const keyboardKey = key;
            cleanupPromises.push(
              this.keyboard.toggleKey(keyboardKey, false).catch((err) => {
                console.error(`Error releasing key ${key} during cleanup:`, err);
                // Ignore errors during cleanup
              }),
            );
          } catch (validationError) {
            console.error(`Error validating key ${key} during cleanup:`, validationError);
            // Continue with other keys
          }
        }
        await Promise.all(cleanupPromises);
      } catch {
        // Ignore errors during cleanup
      }

      return {
        success: false,
        message: `Failed to press key combination: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async holdKey(operation: KeyHoldOperation): Promise<WindowsControlResponse> {
    try {
      // Validate key hold operation using Zod schema
      KeyHoldOperationSchema.parse(operation);

      // Toggle the key state (down/up)
      await this.keyboard.toggleKey(operation.key, operation.state === 'down');

      // If it's a key press (down) with duration, wait for the specified duration then release
      if (operation.state === 'down' && operation.duration) {
        await new Promise((resolve) => setTimeout(resolve, operation.duration));
        await this.keyboard.toggleKey(operation.key, false);
      }

      return {
        success: true,
        message: `Key ${operation.key} ${operation.state === 'down' ? 'held' : 'released'} successfully${
          operation.state === 'down' && operation.duration ? ` for ${operation.duration}ms` : ''
        }`,
      };
    } catch (error) {
      // Ensure key is released in case of error during hold
      if (operation.state === 'down') {
        try {
          await this.keyboard.toggleKey(operation.key, false);
        } catch (releaseError) {
          console.error(`Error releasing key ${operation.key} during cleanup:`, releaseError);
          // Ignore errors during cleanup
        }
      }

      return {
        success: false,
        message: `Failed to ${operation.state} key ${operation.key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
