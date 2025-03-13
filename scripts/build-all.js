import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure we're in the project root
const projectRoot = resolve(__dirname, '..');
process.chdir(projectRoot);

console.log('Starting build process...');

// Setup nut-core
console.log('Setting up nut-core...');
const fs = await import('fs');
if (!fs.existsSync('nut-core')) {
  console.log('Cloning nut-core...');
  execSync('git clone https://github.com/nut-tree/libnut-core.git nut-core', { stdio: 'inherit' });
} else {
  console.log('Updating nut-core...');
  execSync('git pull', { cwd: 'nut-core', stdio: 'inherit' });
}
console.log('Building nut-core...');
execSync('npm install && npm run build:release', { cwd: 'nut-core', stdio: 'inherit' });

// Build TypeScript
console.log('Building TypeScript...');
execSync('npm run build:ts', { stdio: 'inherit' });

console.log('Build complete! The server is ready to use.');
