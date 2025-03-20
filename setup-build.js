#!/usr/bin/env node

/**
 * This script prepares the environment for building without using patch-package
 * It's used as a prebuild step in EAS builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Log start of setup
console.log('Setting up build environment...');

// Run the OpenAI browser fix script
try {
  console.log('Fixing OpenAI browser compatibility...');
  require('./fix-openai-browser');
  console.log(' OpenAI browser compatibility fixed');
} catch (error) {
  console.error(' Error fixing OpenAI browser compatibility:', error);
}

// Remove patches directory to prevent patch-package from running
const patchesDir = path.join(__dirname, 'patches');
if (fs.existsSync(patchesDir)) {
  console.log('Removing patches directory to prevent patch-package from running...');
  try {
    fs.rmSync(patchesDir, { recursive: true, force: true });
    console.log(' Patches directory removed');
  } catch (error) {
    console.error(' Error removing patches directory:', error);
  }
}

console.log(' Build environment setup complete');

// Set exit code to success
process.exit(0);
