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
}

/**
 * CORS configuration for HTTP server
 */
export interface CorsConfig {
  /**
   * Allowed origins
   * Default: ['*']
   */
  origins?: string[];

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
export function loadConfig(): AutomationConfig {
  // Parse HTTP port from environment if available
  const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : undefined;
  
  // Determine transport type from command line arguments
  const useHttp = process.argv.includes('--http');
  const transportType = useHttp ? 'http' : 'stdio';
  
  return {
    provider: process.env.AUTOMATION_PROVIDER || 'keysender',
    transport: transportType,
    http: {
      port: httpPort || 3000,
      path: process.env.HTTP_PATH || '/mcp',
      apiKey: process.env.API_KEY,
      cors: {
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
        methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
        headers: [
          'Content-Type', 
          'Accept', 
          'Authorization', 
          'x-api-key', 
          'Mcp-Session-Id', 
          'Last-Event-ID'
        ],
        credentials: true
      }
    }
  };
}
