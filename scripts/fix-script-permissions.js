#!/usr/bin/env node

/**
 * This script fixes the permissions of the scripts in the scripts directory
 * to ensure they are executable on Unix-based systems
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Only run on Unix-based systems
if (os.platform() === 'win32') {
  console.log('Skipping permission fix on Windows');
  process.exit(0);
}

console.log('Fixing script permissions...');

try {
  const scriptsDir = path.join(__dirname);
  
  // Get all JavaScript files in the scripts directory
  const scriptFiles = fs.readdirSync(scriptsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(scriptsDir, file));
  
  // Make each script executable
  scriptFiles.forEach(scriptFile => {
    console.log(`Making ${scriptFile} executable...`);
    execSync(`chmod +x ${scriptFile}`);
  });
  
  console.log('Script permissions fixed');
} catch (error) {
  console.error('Error fixing script permissions:', error);
  process.exit(1);
}
