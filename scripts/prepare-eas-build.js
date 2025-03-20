#!/usr/bin/env node

/**
 * This script prepares the environment for EAS Build
 * It should be run before starting an EAS Build
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Preparing environment for EAS Build...');

try {
  // Run all the fix scripts
  console.log('Fixing script permissions...');
  require('./fix-script-permissions');
  
  console.log('Cleaning CocoaPods cache...');
  require('./clean-cocoapods-cache');
  
  console.log('Updating CocoaPods repositories...');
  require('./update-cocoapods-repos');
  
  console.log('Fixing Firebase pod dependencies...');
  require('./fix-firebase-pods');
  
  console.log('Adding missing React Native dependencies...');
  require('./add-missing-pods');
  
  console.log('Environment prepared for EAS Build');
} catch (error) {
  console.error('Error preparing environment for EAS Build:', error);
  process.exit(1);
}
