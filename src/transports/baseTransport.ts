import { Express } from 'express';

/**
 * Base transport class that all transport implementations should extend
 */
export abstract class Transport {
  /**
   * Attaches this transport to the Express application
   * @param app Express application instance
   * @returns void
   */
  abstract attach(app: Express): void;
}
