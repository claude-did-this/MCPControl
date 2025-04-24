# MCPControl - Development Guide

## Build & Test Commands
- Build: `pwsh.exe -c "npm run build"` - Compiles TypeScript to JavaScript
- Lint: `pwsh.exe -c "npm run lint"` - Runs ESLint to check code quality
- Format: `pwsh.exe -c "npm run format"` - Runs Prettier to format code
- Format Check: `pwsh.exe -c "npm run format:check"` - Checks if files are properly formatted
- Test: `pwsh.exe -c "npm run test"` - Runs all Vitest tests
- Run single test: `pwsh.exe -c "npm run test -- tools/keyboard.test.ts"` or `pwsh.exe -c "npm run test -- -t \"specific test name\""`
- Watch tests: `pwsh.exe -c "npm run test:watch"` - Runs tests in watch mode
- Coverage: `pwsh.exe -c "npm run test:coverage"` - Generates test coverage report

> Note: MCP Servers are typically launched by the Client as a subprocess.

## Code Style Guidelines
- **Imports**: Use ES module syntax with named imports
- **Types**: Define TypeScript interfaces for inputs/outputs in `types/` directory
- **Error Handling**: Use try/catch with standardized response objects
- **Naming**: camelCase for variables/functions, PascalCase for interfaces
- **Functions**: Keep functions small and focused on single responsibility
- **Comments**: Add JSDoc comments for public APIs
- **Testing**: Place tests in same directory as implementation with `.test.ts` suffix
- **Formatting**: Code is formatted using Prettier (pre-commit hooks will run automatically)
- **Error Responses**: Return `{ success: false, message: string }` for errors
- **Success Responses**: Return `{ success: true, data?: any }` for success
- **Logging**: Use the logger from `src/logger.js` for all logging. Never use `console.log` or `process.stderr.write` directly.

## Logging System
The project uses [pino](https://getpino.io/) for structured logging:

```typescript
import logger from './logger.js';

// Log levels: trace, debug, info, warn, error, fatal
logger.info('Simple log message');

// Structured logging with context
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// Error logging
try {
  // Some operation that might fail
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error({ error: errorMessage }, `Operation failed: ${errorMessage}`);
}
```

- Configure log level with the `LOG_LEVEL` environment variable (default is 'info')
- In development mode, logs are pretty-printed automatically
- HTTP request logging is handled by pino-http middleware
- All logs include correlation IDs for traceability
- Logs are automatically flushed during shutdown

### Log Correlation and Tracking

Logs are correlated using automatically included identifiers:

- `requestId`: Unique ID for each HTTP request
- `sessionId`: MCP session identifier
- `eventId`: Event identifier for streaming events
- `replayId`: ID for tracking event replay operations
- `shutdownId`: ID for server shutdown process

```typescript
// Import logger and request context
import logger, { requestContext } from './logger.js';

// Run code with correlation context
requestContext.run({ operationId: 'abc-123' }, async () => {
  // All logs in this block will include operationId: 'abc-123'
  logger.info('Starting operation');
  await doSomething();
  logger.info('Operation completed');
});
```

### Log Flushing

All logs are flushed to disk automatically during shutdown:

```typescript
// Manual log flushing when needed
await logger.flush();
```