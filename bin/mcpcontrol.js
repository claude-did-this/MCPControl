#!/usr/bin/env node

/**
 * MCPControl entry point for global npm installation
 * This script is used when the package is installed globally via npm.
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the path to the main script
const mainScript = resolve(__dirname, '../build/index.js');

// Load and run the main application
import(mainScript).catch(error => {
  console.error('Failed to start MCPControl:', error);
  process.exit(1);
});