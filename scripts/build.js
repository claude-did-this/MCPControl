#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Build script for MCPControl and libnut-core dependency
 * Handles the complete build process including dependency setup
 * 
 * Supports different build modes:
 * - Full build: Builds with libnut-core (default)
 * - Windows build: Builds without libnut-core for npm package
 */

// Parse arguments
const args = process.argv.slice(2);
const skipNutjs = args.includes('--skip-nutjs') || process.env.SKIP_NUTJS === 'true';
const npmBuild = args.includes('--npm') || process.env.NPM_BUILD === 'true';

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
  // Detect platform
  const platform = process.platform;
  
  console.log(`\n${colors.green}===== MCPControl Build Process =====${colors.reset}`);
  console.log(`Platform: ${platform}`);
  console.log(`Build mode: ${npmBuild ? 'NPM package' : 'Full build'}`);
  console.log(`NutJS: ${skipNutjs ? 'Skipped' : 'Included'}\n`);
  
  // For npm builds or when explicitly skipping NutJS, don't build libnut-core
  if (skipNutjs) {
    console.log(`${colors.yellow}Skipping libnut-core build as requested${colors.reset}`);
  } else {
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
  }
  
  // Build MCPControl
  console.log(`\n${colors.blue}Building MCPControl...${colors.reset}`);
  execute('npm run build');
  
  console.log(`\n${colors.green}===== Build Complete =====${colors.reset}`);
  console.log(`${colors.green}MCPControl has been successfully built!${colors.reset}`);
  
  if (npmBuild) {
    console.log(`\n${colors.yellow}Note: This build is suitable for npm packaging.${colors.reset}`);
    if (platform === 'win32') {
      console.log(`${colors.green}Windows build ready for packaging.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}Warning: Building npm package on ${platform}. For best results, build on Windows.${colors.reset}\n`);
    }
  } else {
    console.log(`\n${colors.green}Full build completed with all dependencies.${colors.reset}\n`);
  }
}

// Run the build process
build();
