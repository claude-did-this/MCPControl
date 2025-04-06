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