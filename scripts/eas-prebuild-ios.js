#!/usr/bin/env node

/**
 * This script runs all necessary steps for EAS iOS prebuild
 * It's designed to be called directly by EAS without any additional arguments
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running iOS prebuild preparation script...');

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
  platform = process.env.EAS_BUILD_PLATFORM || 'ios'; // Default to iOS
}

console.log(`Detected platform: ${platform}`);

// Only proceed if platform is iOS
if (platform.toLowerCase() === 'ios') {
  // Execute each step in sequence
  try {
    console.log('Step 1: Running fix-firebase-swift.js');
    require('./fix-firebase-swift.js');
    
    console.log('Step 2: Running fix-swift-interface.js');
    require('./fix-swift-interface.js');
    
    console.log('Step 3: Running copy-swift-config.js');
    require('./copy-swift-config.js');
    
    console.log('Step 4: Running fix-ios-pods.js');
    require('./fix-ios-pods.js');
    
    console.log('Step 5: Running expo prebuild for iOS');
    execSync('npx expo prebuild --platform ios', { stdio: 'inherit' });
    
    console.log('iOS prebuild preparation completed successfully!');
  } catch (error) {
    console.error('Error during iOS prebuild preparation:', error.message);
    process.exit(1);
  }
} else {
  console.log(`Skipping iOS prebuild for platform: ${platform}`);
}
