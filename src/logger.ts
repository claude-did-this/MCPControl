/**
 * Centralized logger using Pino
 * Provides consistent logging with configurable log levels
 */

/**
 * Log levels in order of verbosity (most verbose to least verbose)
 * - trace: Most detailed information for tracing code execution
 * - debug: Debugging information useful during development
 * - info: General information about normal operation
 * - warn: Warning conditions that should be reviewed
 * - error: Error conditions that don't interrupt operation
 * - fatal: Critical errors that might interrupt operation
 * - silent: No logs at all
 */
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

/**
 * Interface for a logger
 */
export interface Logger {
  trace(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  fatal(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Simple console-based logger implementation
 * This will be replaced with Pino in the package.json update
 */
class ConsoleLogger implements Logger {
  private level: number;
  private readonly levelMap: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
    silent: 100,
  };
  private context: Record<string, unknown> = {};

  constructor(level: LogLevel = 'info', context: Record<string, unknown> = {}) {
    this.level = this.levelMap[level];
    this.context = context;
  }

  private formatMessage(msg: string): string {
    if (Object.keys(this.context).length === 0) {
      return msg;
    }

    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' ');

    return `[${contextStr}] ${msg}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelMap[level] >= this.level;
  }

  trace(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('trace')) {
      console.log(`[TRACE] ${this.formatMessage(msg)}`, ...args);
    }
  }

  debug(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${this.formatMessage(msg)}`, ...args);
    }
  }

  info(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${this.formatMessage(msg)}`, ...args);
    }
  }

  warn(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${this.formatMessage(msg)}`, ...args);
    }
  }

  error(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${this.formatMessage(msg)}`, ...args);
    }
  }

  fatal(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('fatal')) {
      console.error(`[FATAL] ${this.formatMessage(msg)}`, ...args);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger(
      Object.keys(this.levelMap).find(
        (key) => this.levelMap[key as LogLevel] === this.level,
      ) as LogLevel,
      { ...this.context, ...bindings },
    );
  }
}

/**
 * Get log level from environment variable or use default
 */
export function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;

  // Validate that the provided level is valid
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

  if (envLevel && validLevels.includes(envLevel)) {
    return envLevel;
  }

  // Default to info in production, debug in development/test
  if (process.env.NODE_ENV === 'production') {
    return 'info';
  } else if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return 'silent'; // Silent in tests unless explicitly set
  } else {
    return 'debug';
  }
}

// Create the default logger instance
export const logger: Logger = new ConsoleLogger(getLogLevel());

/**
 * Create a child logger with component context
 * @param component Component name or identifier
 * @returns Logger instance with component context
 */
export function createLogger(component: string): Logger {
  return logger.child({ component });
}

export default logger;
