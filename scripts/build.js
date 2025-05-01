#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Build script for MCPControl
 * Handles the complete build process
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Executes a shell command and pipes output to console
 * @param {string} command - Command to execute
 * @param {Object} options - Options for child_process.execSync
 * @returns {Buffer} Command output
 */
function execute(command, options = {}) {
  console.log(`${colors.cyan}> ${command}${colors.reset}`);
  
  const defaultOptions = { 
    stdio: 'inherit',
    ...options
  };
  
  try {
    return execSync(command, defaultOptions);
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    process.exit(1);
  }
}

// Main build process
function build() {
  console.log(`\n${colors.green}===== MCPControl Build Process =====${colors.reset}\n`);
  
  // Install dependencies using npm ci for faster and deterministic installs
  console.log(`\n${colors.blue}Installing dependencies...${colors.reset}`);
  execute('npm ci');
  
  // Build MCPControl
  console.log(`\n${colors.blue}Building MCPControl...${colors.reset}`);
  execute('npm run build');
  
  console.log(`\n${colors.green}===== Build Complete =====${colors.reset}`);
  console.log(`${colors.green}MCPControl has been successfully built!${colors.reset}\n`);
}

// Run the build process
build();
