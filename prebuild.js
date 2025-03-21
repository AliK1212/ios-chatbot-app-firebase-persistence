#!/usr/bin/env node

/**
 * This script is used as a prebuild hook for EAS Build
 * It sets up the necessary configurations for OpenAI and Firebase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running prebuild script...');

// Run OpenAI browser fix
try {
  console.log('Setting up OpenAI browser compatibility...');
  execSync('node fix-openai-browser.js', { stdio: 'inherit' });
  console.log('Successfully configured OpenAI for browser environment');
} catch (error) {
  console.error('Error setting up OpenAI browser compatibility:', error.message);
  // Continue with the build even if this fails
}

// Check for GoogleService-Info.plist
const googleServiceInfo = path.join(__dirname, 'GoogleService-Info.plist');
if (!fs.existsSync(googleServiceInfo)) {
  console.log('Warning: GoogleService-Info.plist not found at project root');
  console.log('Firebase functionality may not work correctly');
}

console.log('Prebuild script completed');
process.exit(0); // Explicitly exit with success code
