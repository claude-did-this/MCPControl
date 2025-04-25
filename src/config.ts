import logger from './logger.js';

/**
 * Configuration interface for automation settings
 */
export interface AutomationConfig {
  /**
   * The provider to use for automation
   * Currently supported: 'keysender'
   */
  provider: string;

  /**
   * HTTP server configuration
   */
  http?: HttpServerConfig;

  /**
   * Transport type to use ('stdio' or 'http')
   * If not specified, 'stdio' is used by default
   */
  transport?: 'stdio' | 'http';
}

/**
 * HTTP server configuration
 */
export interface HttpServerConfig {
  /**
   * Port to listen on
   * Default: 3000
   */
  port?: number;

  /**
   * Path for the MCP endpoint
   * Default: '/mcp'
   */
  path?: string;

  /**
   * API key for authentication
   * If not provided, authentication is disabled
   */
  apiKey?: string;

  /**
   * CORS configuration
   */
  cors?: CorsConfig;

  /**
   * Event store configuration for SSE resumability
   */
  eventStore?: {
    /**
     * Maximum number of events to store in memory
     * Default: 10000
     */
    maxEvents?: number;

    /**
     * Maximum age of events in minutes before they're removed
     * Default: 30
     */
    maxEventAgeInMinutes?: number;
  };
}

/**
 * CORS configuration for HTTP server
 */
export interface CorsConfig {
  /**
   * Allowed origins
   * Default: 'localhost' for security
   * SECURITY WARNING: Using '*' will allow any origin to access the API,
   * which is a security risk in production environments.
   */
  origins?: string[] | string;

  /**
   * Allowed HTTP methods
   * Default: ['GET', 'POST', 'OPTIONS', 'DELETE']
   */
  methods?: string[];

  /**
   * Allowed headers
   * Default: ['Content-Type', 'Accept', 'Authorization', 'x-api-key', 'Mcp-Session-Id', 'Last-Event-ID']
   */
  headers?: string[];

  /**
   * Whether to allow credentials
   * Default: true
   */
  credentials?: boolean;
}

/**
 * Load configuration from environment variables
 */
/**
 * Validates a numeric environment variable, ensuring it's within acceptable bounds
 * @param envVarName The name of the environment variable
 * @param defaultValue Default value to use if environment variable is not set
 * @param minValue Minimum acceptable value
 * @param maxValue Maximum acceptable value
 * @returns The validated value
 */
function validateNumberEnvVar(
  envVarName: string,
  defaultValue: number,
  minValue: number,
  maxValue: number,
): number {
  const envVar = process.env[envVarName];
  if (!envVar) {
    return defaultValue;
  }

  try {
    const parsedValue = parseInt(envVar, 10);

    // Check for NaN
    if (isNaN(parsedValue)) {
      logger.warn(
        { envVar: envVarName, value: envVar, default: defaultValue },
        `WARNING: Invalid value for ${envVarName} "${envVar}". Using default value ${defaultValue}.`,
      );
      return defaultValue;
    }

    // Ensure the value is within bounds
    if (parsedValue < minValue) {
      logger.warn(
        { envVar: envVarName, value: parsedValue, min: minValue },
        `WARNING: ${envVarName} value ${parsedValue} is too low. Using minimum value ${minValue}.`,
      );
      return minValue;
    }

    if (parsedValue > maxValue) {
      logger.warn(
        { envVar: envVarName, value: parsedValue, max: maxValue },
        `WARNING: ${envVarName} value ${parsedValue} is too high. Using maximum value ${maxValue}.`,
      );
      return maxValue;
    }

    return parsedValue;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(
      { envVar: envVarName, error: errorMessage, default: defaultValue },
      `WARNING: Error parsing ${envVarName}: ${errorMessage}. Using default value ${defaultValue}.`,
    );
    return defaultValue;
  }
}

export function loadConfig(): AutomationConfig {
  // Parse HTTP port from environment if available
  const httpPort = validateNumberEnvVar('HTTP_PORT', 3000, 1024, 65535);

  // Determine transport type from command line arguments
  const useHttp = process.argv.includes('--http');
  const transportType = useHttp ? 'http' : 'stdio';

  return {
    provider: process.env.AUTOMATION_PROVIDER || 'keysender',
    transport: transportType,
    http: {
      port: httpPort,
      path: process.env.HTTP_PATH || '/mcp',
      apiKey: process.env.API_KEY,
      cors: {
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : 'localhost',
        methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
        headers: [
          'Content-Type',
          'Accept',
          'Authorization',
          'x-api-key',
          'Mcp-Session-Id',
          'Last-Event-ID',
        ],
        credentials: true,
      },
      eventStore: {
        maxEvents: validateNumberEnvVar('MAX_EVENTS', 10000, 1, 1000000),
        maxEventAgeInMinutes: validateNumberEnvVar('MAX_EVENT_AGE_MINUTES', 30, 1, 1440), // Max 24 hours
      },
    },
  };
}
