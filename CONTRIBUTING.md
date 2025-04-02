# Contributing to MCP Control

Thank you for your interest in contributing to MCP Control! This document provides guidelines and instructions for contributing to the project.

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

- `master` branch contains the latest stable code
- Create feature branches from `master` using the naming convention:
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

Check the [GitHub issues](https://github.com/Cheffromspace/MCPControl/issues) for existing issues you might want to contribute to. Current focus areas include:

1. Creating an npm package for easy installation
2. Adding remote computer control support
3. Building a dedicated test application

When creating a new issue:
- Use descriptive titles
- Include steps to reproduce for bugs
- For feature requests, explain the use case and potential implementation approach

## Future Roadmap

See the [TASKS.md](./TASKS.md) file for the current roadmap and planned features, which include:

- Security implementation improvements
- Comprehensive testing
- Error handling enhancements
- Performance optimization
- Automation framework
- Enhanced window management
- Advanced integration features

## Publishing

This project uses GitHub Actions to automatically publish to npm when a version tag is pushed to master:

1. Ensure changes are merged to master
2. Create and push a tag with the version number:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. The GitHub Action will automatically:
   - Build and test the package
   - Update the version in package.json
   - Publish to npm

Note: You need to have the `NPM_TOKEN` secret configured in the GitHub repository settings.

---

Thank you for contributing to MCP Control!
