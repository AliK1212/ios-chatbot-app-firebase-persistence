#!/usr/bin/env node

/**
 * This script is used as a prebuild hook for EAS Build
 * It applies patches to node_modules using patch-package
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running prebuild script...');

// Check if patches directory exists and has files
const patchesDir = path.join(__dirname, 'patches');
if (fs.existsSync(patchesDir)) {
  const patches = fs.readdirSync(patchesDir);
  
  if (patches.length > 0) {
    console.log(`Found ${patches.length} patches to apply`);
    
    try {
      // Run patch-package
      console.log('Applying patches with patch-package...');
      execSync('npx patch-package', { stdio: 'inherit' });
      console.log('Successfully applied patches');
    } catch (error) {
      console.error('Error applying patches:', error.message);
      // Don't exit with error code, as this might be non-critical
      // and we want the build to continue
    }
  } else {
    console.log('No patches found in patches directory');
  }
} else {
  console.log('No patches directory found');
}

console.log('Prebuild script completed');
process.exit(0); // Explicitly exit with success code
