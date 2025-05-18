#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[postinstall] Copying pre-built keysender binary...');

const sourceDir = path.join(__dirname, '..', 'prebuilt', 'keysender');
const targetDir = path.join(__dirname, '..', 'node_modules', 'keysender', 'build', 'Release');
const sourceFile = path.join(sourceDir, 'key_sender.node');
const targetFile = path.join(targetDir, 'key_sender.node');

// Create target directory if it doesn't exist
fs.mkdirSync(targetDir, { recursive: true });

// Copy the pre-built binary
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log('[postinstall] Successfully copied key_sender.node');
} catch (error) {
  console.error('[postinstall] Error copying pre-built binary:', error.message);
  // Don't exit with error - allow npm to continue
}