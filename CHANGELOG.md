# Changelog

All notable changes to MCPControl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Replaced keysender with nutjs (@nut-tree-fork/libnut) as the default automation provider
- Updated build requirements to include native compilation tools
- Disabled npm publishing workflow (nutjs requires building from source)

### Added
- Type definitions for @nut-tree-fork/libnut
- Documentation about extensibility for macOS and Linux providers

### Removed
- keysender dependency and provider implementation
- Empty robotjs provider directory
- Test scripts that were specific to keysender

### Fixed
- All tests now pass with nutjs provider
- Async/await issues in screen automation tests
- Updated all documentation to reflect nutjs as default provider

## [0.2.0] - 2025-03-27

### Added
- Structured logging with Pino
- Modular provider architecture
- AutoHotkey v2 provider support
- PowerShell clipboard provider
- Provider registry system
- E2E testing framework

### Changed
- Improved error handling and response consistency
- Enhanced CI/CD pipeline with caching
- Better TypeScript type safety

### Fixed
- Window management reliability issues
- Screenshot capture edge cases
- Build process optimizations

## [0.1.22] - Previous releases

See GitHub releases for full history.