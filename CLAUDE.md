# MCPControl - Development Guide

## Build & Test Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript
- Start: `npm run start` - Runs the built application
- Dev: `npm run dev` - Watches for changes and rebuilds
- Test: `npm run test` - Runs all Vitest tests
- Run single test: `npm run test -- tools/keyboard.test.ts` or `npm run test -- -t "specific test name"`
- Watch tests: `npm run test:watch` - Runs tests in watch mode
- Coverage: `npm run test:coverage` - Generates test coverage report

## Code Style Guidelines
- **Imports**: Use ES module syntax with named imports
- **Types**: Define TypeScript interfaces for inputs/outputs in `types/` directory
- **Error Handling**: Use try/catch with standardized response objects
- **Naming**: camelCase for variables/functions, PascalCase for interfaces
- **Functions**: Keep functions small and focused on single responsibility
- **Comments**: Add JSDoc comments for public APIs
- **Testing**: Place tests in same directory as implementation with `.test.ts` suffix
- **Formatting**: 2-space indentation, semicolons required
- **Error Responses**: Return `{ success: false, message: string }` for errors
- **Success Responses**: Return `{ success: true, data?: any }` for success