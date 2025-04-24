import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Define the context interface with all possible correlation fields
export interface LoggerContext {
  requestId?: string;
  sessionId?: string;
  eventId?: string;
  replayId?: string;
  shutdownId?: string;
  [key: string]: unknown;
}

// Create async local storage for request context
export const requestContext = new AsyncLocalStorage<LoggerContext>();

// Set up destination streams
const destination = pino.destination({ sync: false });

// Create base pino instance
export const baseLogger = pino(
  {
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    level: process.env.LOG_LEVEL || 'info',
  },
  destination,
);

// Define types for the log functions
type LogFn = (obj: object | string, msg?: string, ...args: unknown[]) => void;

// Create a simpler contextual logger
const logger = {
  trace: contextualLog(baseLogger.trace.bind(baseLogger)),
  debug: contextualLog(baseLogger.debug.bind(baseLogger)),
  info: contextualLog(baseLogger.info.bind(baseLogger)),
  warn: contextualLog(baseLogger.warn.bind(baseLogger)),
  error: contextualLog(baseLogger.error.bind(baseLogger)),
  fatal: contextualLog(baseLogger.fatal.bind(baseLogger)),

  // Add a flush method to ensure logs are written
  flush: (): Promise<void> => {
    return new Promise<void>((resolve) => {
      destination.flushSync();
      resolve();
    });
  },
};

// Helper function to create a contextual log method
function contextualLog(logFn: LogFn): LogFn {
  return function (objOrMsg: object | string, msg?: string, ...args: unknown[]): void {
    const context = requestContext.getStore();

    if (context) {
      if (typeof objOrMsg === 'object' && objOrMsg !== null) {
        // Merge context with first object argument
        objOrMsg = { ...objOrMsg, ...context };
      } else if (typeof objOrMsg === 'string') {
        // We need to shift things around if the first arg is a string
        // calling pattern is: logger.info('message') -> logger.info({context}, 'message')
        return logFn({ ...context }, objOrMsg, ...(msg ? [msg, ...args] : args));
      }
    }

    return logFn(objOrMsg, msg, ...args);
  };
}

export default logger;
