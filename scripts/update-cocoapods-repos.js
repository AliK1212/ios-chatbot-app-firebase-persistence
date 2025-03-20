#!/usr/bin/env node

/**
 * This script updates CocoaPods repositories
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

  // Simpler approach - just add the trunk repo
  console.log('Setting up CocoaPods trunk repository...');
  
  try {
    // Add the trunk repo
    execSync('pod repo add trunk https://cdn.cocoapods.org/', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('Successfully added trunk repository');
  } catch (error) {
    console.log('Trunk repository already exists or error adding it:', error.message);
  }
  
  // Update the repos
  console.log('Updating CocoaPods repositories...');
  execSync('pod repo update', { 
    cwd: iosDir,
    stdio: 'inherit'
  });
  console.log('Successfully updated CocoaPods repositories');
  
  console.log('CocoaPods repositories setup complete');
} catch (error) {
  console.error('Error updating CocoaPods repositories:', error);
  process.exit(1);
}
