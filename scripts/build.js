#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Build script for MCPControl and libnut-core dependency
 * Handles the complete build process including dependency setup
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
  
  // Check if cmake-js is installed
  try {
    execSync('cmake-js --version', { stdio: 'pipe' });
    console.log(`${colors.green}✓ cmake-js is installed${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠ cmake-js is not installed. Installing globally...${colors.reset}`);
    execute('npm install -g cmake-js');
  }
  
  // Check if libnut-core exists, if not clone it
  const libnutPath = path.join(process.cwd(), 'libnut-core');
  if (!fs.existsSync(libnutPath)) {
    console.log(`\n${colors.blue}Cloning libnut-core...${colors.reset}`);
    execute('git clone https://github.com/nut-tree/libnut.git libnut-core');
  } else {
    console.log(`\n${colors.green}✓ libnut-core already exists${colors.reset}`);
  }
  
  // Build libnut-core
  console.log(`\n${colors.blue}Building libnut-core...${colors.reset}`);
  process.chdir('libnut-core');
  execute('npm install');
  execute('cmake-js rebuild');
  process.chdir('..');
  
  // Build MCPControl
  console.log(`\n${colors.blue}Building MCPControl...${colors.reset}`);
  execute('npm run build');
  
  console.log(`\n${colors.green}===== Build Complete =====${colors.reset}`);
  console.log(`${colors.green}MCPControl has been successfully built!${colors.reset}\n`);
}

// Run the build process
build();
