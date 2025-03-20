#!/usr/bin/env node

/**
 * This script updates CocoaPods repositories to ensure all dependencies can be found
 * It should be run during the prebuild process for iOS builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Updating CocoaPods repositories...');

try {
  // Check if we're in an iOS build environment
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, skipping CocoaPods repo update');
    process.exit(0);
  }

  // Update CocoaPods repos
  console.log('Running pod repo update...');
  execSync('pod repo update', { 
    cwd: iosDir,
    stdio: 'inherit'
  });
  console.log('CocoaPods repositories updated successfully');

  // Create a .pod-repo-update file to indicate that repos have been updated
  fs.writeFileSync(path.join(iosDir, '.pod-repo-update'), new Date().toISOString());
  console.log('Created .pod-repo-update marker file');
} catch (error) {
  console.error('Error updating CocoaPods repositories:', error);
  process.exit(1);
}
