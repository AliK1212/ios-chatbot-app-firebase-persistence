#!/usr/bin/env node

/**
 * This script is specifically designed to run as the prebuildCommand in eas.json
 * It handles all the necessary steps to fix CocoaPods issues for iOS builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting iOS CocoaPods fix script...');

try {
  // Check if we're in an iOS build environment
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, creating it...');
    fs.mkdirSync(iosDir, { recursive: true });
  }

  // Clean CocoaPods cache
  console.log('Cleaning CocoaPods cache...');
  try {
    execSync('pod cache clean --all', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('CocoaPods cache cleaned successfully');
  } catch (error) {
    console.log('Error cleaning CocoaPods cache, but continuing:', error.message);
  }

  // Add the trunk repo
  console.log('Setting up CocoaPods trunk repository...');
  try {
    execSync('pod repo add trunk https://cdn.cocoapods.org/ || true', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('Successfully set up trunk repository');
  } catch (error) {
    console.log('Trunk repository already exists or error adding it, but continuing:', error.message);
  }
  
  // Update the repos
  console.log('Updating CocoaPods repositories...');
  try {
    execSync('pod repo update', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('Successfully updated CocoaPods repositories');
  } catch (error) {
    console.log('Error updating CocoaPods repositories, but continuing:', error.message);
  }
  
  // Fix Firebase pods if needed
  console.log('Fixing Firebase pods...');
  try {
    require('./fix-firebase-pods');
    console.log('Firebase pods fixed successfully');
  } catch (error) {
    console.log('Error fixing Firebase pods, but continuing:', error.message);
  }

  console.log('iOS CocoaPods fix script completed successfully');
} catch (error) {
  console.error('Error in iOS CocoaPods fix script:', error);
  process.exit(1);
}
