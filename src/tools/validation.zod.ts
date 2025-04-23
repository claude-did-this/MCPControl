import { z } from 'zod';

// Constants for validation
export const MAX_TEXT_LENGTH = 1000;
export const MAX_ALLOWED_COORDINATE = 10000; // Reasonable maximum screen dimension
export const MAX_SCROLL_AMOUNT = 1000;

/**
 * List of allowed keyboard keys for validation
 */
export const VALID_KEYS = [
  // Letters
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  // Numbers
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  // Special keys
  'space',
  'escape',
  'tab',
  'alt',
  'control',
  'shift',
  'right_shift',
  'command',
  'windows',
  'enter',
  'return',
  'backspace',
  'delete',
  'home',
  'end',
  'page_up',
  'page_down',
  'left',
  'up',
  'right',
  'down',
  // Function keys
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12',
  // Symbols
  '.',
  ',',
  '/',
  '\\',
  '[',
  ']',
  '{',
  '}',
  '(',
  ')',
  ';',
  ':',
  "'",
  '"',
  '`',
  '-',
  '=',
  'plus',
  '?',
  '!',
  '@',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '_',
  '<',
  '>',
];

/**
 * Zod schema for mouse position validation
 */
export const MousePositionSchema = z.object({
  x: z
    .number()
    .min(-MAX_ALLOWED_COORDINATE, `X coordinate cannot be less than -${MAX_ALLOWED_COORDINATE}`)
    .max(MAX_ALLOWED_COORDINATE, `X coordinate cannot be more than ${MAX_ALLOWED_COORDINATE}`)
    .refine((val) => !isNaN(val), 'X coordinate cannot be NaN'),
  y: z
    .number()
    .min(-MAX_ALLOWED_COORDINATE, `Y coordinate cannot be less than -${MAX_ALLOWED_COORDINATE}`)
    .max(MAX_ALLOWED_COORDINATE, `Y coordinate cannot be more than ${MAX_ALLOWED_COORDINATE}`)
    .refine((val) => !isNaN(val), 'Y coordinate cannot be NaN'),
});

/**
 * Zod schema for mouse button validation
 */
export const MouseButtonSchema = z.enum(['left', 'right', 'middle']);

/**
 * Zod schema for keyboard key validation
 */
export const KeySchema = z.string().refine(
  (key) => VALID_KEYS.includes(key.toLowerCase()),
  (key) => ({ message: `Invalid key: "${key}". Must be one of the allowed keys.` }),
);

/**
 * Helper function to detect dangerous key combinations
 */
function isDangerousKeyCombination(keys: string[]): string | null {
  const normalizedKeys = keys.map((k) => k.toLowerCase());

  // Temporary restriction: Block ALL Ctrl key combinations to prevent server crashes
  // This is due to stdio handling issues. Will be fixed in future version with HTTP transport
  if (normalizedKeys.includes('control')) {
    return 'Control key combinations are temporarily disabled due to stability issues';
  }

  // Temporary restriction: Block ALL Windows key combinations to prevent server crashes
  // This is due to stdio handling issues. Will be fixed in future version with HTTP transport
  if (normalizedKeys.includes('windows')) {
    return 'Windows key combinations are temporarily disabled due to stability issues';
  }

  // Check for OS-level dangerous combinations
  if (normalizedKeys.includes('command') || normalizedKeys.includes('control')) {
    // Control+Alt+Delete or Command+Option+Esc (Force Quit on Mac)
    if (
      (normalizedKeys.includes('control') &&
        normalizedKeys.includes('alt') &&
        normalizedKeys.includes('delete')) ||
      (normalizedKeys.includes('command') &&
        normalizedKeys.includes('alt') &&
        normalizedKeys.includes('escape'))
    ) {
      return 'This combination can trigger system functions';
    }

    // Block combinations that can open a terminal
    if (
      (normalizedKeys.includes('control') || normalizedKeys.includes('command')) &&
      (normalizedKeys.includes('alt') || normalizedKeys.includes('option')) &&
      normalizedKeys.includes('t')
    ) {
      return 'This combination can open a terminal';
    }
  }

  return null;
}

/**
 * Zod schema for key combination validation
 */
export const KeyCombinationSchema = z.object({
  keys: z
    .array(KeySchema)
    .min(1, 'Key combination must contain at least one key')
    .max(5, 'Too many keys in combination (max 5)')
    .refine(
      (keys) => {
        const dangerous = isDangerousKeyCombination(keys);
        return dangerous === null;
      },
      (keys) => ({
        message: `Potentially dangerous key combination: ${keys.join('+')}. ${isDangerousKeyCombination(keys)}`,
      }),
    ),
});

/**
 * Zod schema for keyboard input validation
 */
export const KeyboardInputSchema = z.object({
  text: z.string().max(MAX_TEXT_LENGTH, `Text length cannot exceed ${MAX_TEXT_LENGTH} characters`),
});

/**
 * Zod schema for key hold operation validation
 */
export const KeyHoldOperationSchema = z
  .object({
    key: KeySchema,
    state: z.enum(['down', 'up']),
    duration: z
      .number()
      .min(0, 'Duration cannot be negative')
      .max(10000, 'Duration too long: maximum is 10000ms (10 seconds)')
      .optional(),
  })
  .strict() // Ensure no extra properties
  .superRefine((data, ctx) => {
    // Check for 'down' state
    if (data.state === 'down') {
      if (data.duration === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duration is required for key down operations',
          path: ['duration'],
        });
      } else if (data.duration < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duration for key down operations must be at least 1ms',
          path: ['duration'],
        });
      }
    }
  })
  // Empty objects should always fail validation
  .refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    {
      message: 'Missing required properties',
    },
  );

/**
 * Zod schema for scroll amount validation
 */
export const ScrollAmountSchema = z
  .number()
  .min(-MAX_SCROLL_AMOUNT, `Scroll amount cannot be less than -${MAX_SCROLL_AMOUNT}`)
  .max(MAX_SCROLL_AMOUNT, `Scroll amount cannot be more than ${MAX_SCROLL_AMOUNT}`)
  .refine((val) => !isNaN(val), 'Scroll amount cannot be NaN');

/**
 * Zod schema for clipboard input validation
 */
export const ClipboardInputSchema = z.object({
  text: z.string().max(MAX_TEXT_LENGTH, `Text length cannot exceed ${MAX_TEXT_LENGTH} characters`),
});

/**
 * Zod schema for screenshot region validation
 */
export const ScreenshotRegionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive('Width must be positive'),
  height: z.number().int().positive('Height must be positive'),
});

/**
 * Zod schema for screenshot resize options validation
 */
export const ScreenshotResizeSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fit: z.enum(['contain', 'cover', 'fill', 'inside', 'outside']).optional(),
});

/**
 * Zod schema for screenshot options validation
 */
export const ScreenshotOptionsSchema = z.object({
  region: ScreenshotRegionSchema.optional(),
  quality: z.number().int().min(1).max(100).optional(),
  format: z.enum(['png', 'jpeg']).optional(),
  grayscale: z.boolean().optional(),
  resize: ScreenshotResizeSchema.optional(),
  compressionLevel: z.number().int().min(0).max(9).optional(),
});

/**
 * Zod schema for window info validation
 */
export const WindowInfoSchema = z.object({
  title: z.string(),
  position: z.object({
    x: z.number().int(),
    y: z.number().int(),
  }),
  size: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});
