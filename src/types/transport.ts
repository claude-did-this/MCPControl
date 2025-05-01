/**
 * Enumeration of supported transport types for MCP server communication
 */
export enum TransportType {
  /**
   * HTTP transport for standard request-response communication
   */
  HTTP = 'HTTP',

  /**
   * Server-Sent Events transport for real-time unidirectional event streaming
   */
  SSE = 'SSE',
}
