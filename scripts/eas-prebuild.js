#!/usr/bin/env node

/**
 * This script is specifically designed to be called by EAS Build as a prebuild command
 * It handles the 'npx expo node' command format and properly forwards to fix-ios-pods.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting EAS prebuild script...');

// Get the platform from arguments or environment variables
const args = process.argv.slice(2);
let platform = null;

// Parse arguments to find the platform
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--platform' && i + 1 < args.length) {
    platform = args[i + 1];
    break;
  }
}

// If platform wasn't found in args, check environment variables
if (!platform) {
  platform = process.env.EAS_BUILD_PLATFORM || 'unknown';
}

console.log(`Detected platform: ${platform}`);

// Only run iOS-specific scripts for iOS platform
if (platform === 'ios') {
  console.log('Running iOS-specific prebuild script...');
  try {
    // Run the fix-ios-pods.js script directly
    const fixIosPodsPath = path.join(__dirname, 'fix-ios-pods.js');
    require(fixIosPodsPath);
    console.log('iOS prebuild script completed successfully');
  } catch (error) {
    console.error('Error running iOS prebuild script:', error);
    process.exit(1);
  }
} else {
  console.log(`No specific prebuild actions needed for platform: ${platform}`);
}

console.log('EAS prebuild script completed successfully');
