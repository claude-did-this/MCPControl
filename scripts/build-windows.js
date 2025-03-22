#!/usr/bin/env node

/**
 * Windows-specific build script for MCPControl npm package
 * This script builds MCPControl without the NutJS dependency
 * suitable for publishing to npm
 */

import { execSync } from 'child_process';

// Set environment variables for the build
process.env.SKIP_NUTJS = 'true';
process.env.NPM_BUILD = 'true';

console.log('Building MCPControl for Windows (npm package)...');
console.log('This build excludes NutJS and uses KeySender as the default provider.');

// Run the main build script with the appropriate flags
execSync('node scripts/build.js --skip-nutjs --npm', { 
  stdio: 'inherit'
});

console.log('Windows build completed successfully!');