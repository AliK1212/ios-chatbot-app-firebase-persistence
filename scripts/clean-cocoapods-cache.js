#!/usr/bin/env node

/**
 * This script cleans the CocoaPods cache to resolve issues with duplicate specifications
 * It should be run during the prebuild process for iOS builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Cleaning CocoaPods cache...');

try {
  // Check if we're in an iOS build environment
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, skipping CocoaPods cache clean');
    process.exit(0);
  }

  // Clean CocoaPods cache
  console.log('Running pod cache clean --all...');
  execSync('pod cache clean --all', { 
    cwd: iosDir,
    stdio: 'inherit'
  });
  console.log('CocoaPods cache cleaned successfully');

  // Create a .pod-cache-clean file to indicate that cache has been cleaned
  fs.writeFileSync(path.join(iosDir, '.pod-cache-clean'), new Date().toISOString());
  console.log('Created .pod-cache-clean marker file');
} catch (error) {
  console.error('Error cleaning CocoaPods cache:', error);
  process.exit(1);
}
