# Contributing to MCPControl

> **Note**: MCPControl is not actively developed or supported. We will accept pull requests for bug fixes and new features, but please understand that response times may be slow and there is no guarantee of merging.

This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Guidelines](#commit-guidelines)
  - [Pull Requests](#pull-requests)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Issue Tracking](#issue-tracking)
- [Future Roadmap](#future-roadmap)

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm
- git
- C++ compiler (for building native modules)

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/MCPControl.git
   cd MCPControl
   ```

3. Build the project:
   ```bash
   # Install dependencies
   npm install

   # Build the project
   npm run build
   ```

## Development Workflow

### Branching Strategy

- `main` branch contains the latest stable code
- Create feature branches from `main` using the naming convention:
  - `feature/feature-name` for new features
  - `bugfix/issue-description` for bug fixes
  - `docs/description` for documentation changes
  - `refactor/description` for code refactoring

### Commit Guidelines

- Write clear, descriptive commit messages
- Reference issue numbers in commit messages when applicable
- Keep commits focused on a single logical change

### Pull Requests

1. Create your feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add some amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request
5. Ensure all tests pass and code meets the project standards
6. Request a review from a maintainer

## Code Style and Standards

- Use ES module syntax with named imports
- Define TypeScript interfaces for inputs/outputs in the `types/` directory
- Use try/catch with standardized response objects for error handling
- Follow naming conventions:
  - camelCase for variables/functions
  - PascalCase for interfaces
- Keep functions small and focused on single responsibility
- Add JSDoc comments for public APIs
- Use 2-space indentation and semicolons
- For errors, return `{ success: false, message: string }`
- For success, return `{ success: true, data?: any }`

## Testing

- Place tests in the same directory as implementation with `.test.ts` suffix
- Run tests with `npm run test`
- Generate coverage report with `npm run test:coverage`
- Run a single test with `npm run test -- tools/keyboard.test.ts` or `npm run test -- -t "specific test name"`
- Run tests in watch mode with `npm run test:watch`

All new features should include appropriate test coverage. The project uses Vitest for testing.

## Documentation

- Document public APIs with JSDoc comments
- Update README.md when adding new features or changing functionality
- Keep code comments clear and focused on explaining "why" rather than "what"

## Project Structure

- `/src`
  - `/handlers` - Request handlers and tool management
  - `/tools` - Core functionality implementations
  - `/types` - TypeScript type definitions
  - `index.ts` - Main application entry point

## Issue Tracking

While we are not actively developing MCPControl, you may still submit issues for:
- Bug reports with clear reproduction steps
- Feature requests (though implementation is not guaranteed)

When creating a new issue:
- Use descriptive titles
- Include steps to reproduce for bugs
- For feature requests, explain the use case and potential implementation approach
- Be prepared to implement the fix/feature yourself via PR

## Areas for Contribution

If you'd like to contribute, here are some areas that could use improvement:

- Cross-platform compatibility enhancements
- Additional automation providers (e.g., macOS, Linux)
- Bug fixes for existing functionality
- Documentation improvements
- Test coverage improvements

Note: There is no active roadmap or planned features as the project is not under active development.

## Publishing

**Note**: MCPControl cannot be published to npm because the nutjs dependency requires compilation from source on each target system. Users must build from source following the instructions in the README.

The npm publish workflow has been disabled. To create a new release:

1. Ensure changes are merged to main
2. Create and push a tag with the version number:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. Create a GitHub release with build instructions

---

Thank you for contributing to MCP Control!
