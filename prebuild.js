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
} else {
  console.log('Found GoogleService-Info.plist file');
}

// Check for google-services.json (Android)
const googleServicesJson = path.join(__dirname, 'google-services.json');
if (!fs.existsSync(googleServicesJson)) {
  console.log('Warning: google-services.json not found at project root');
  console.log('Firebase functionality may not work correctly on Android');
} else {
  console.log('Found google-services.json file');
}

// Check if ios/android directories exist and log a warning
const iosDir = path.join(__dirname, 'ios');
const androidDir = path.join(__dirname, 'android');

if (fs.existsSync(iosDir)) {
  console.log('Warning: iOS directory exists. This may conflict with EAS build.');
  console.log('Ensure you have added /ios/ to your .easignore file.');
}

if (fs.existsSync(androidDir)) {
  console.log('Warning: Android directory exists. This may conflict with EAS build.');
  console.log('Ensure you have added /android/ to your .easignore file.');
}

console.log('Prebuild script completed');
process.exit(0); // Explicitly exit with success code
