#!/usr/bin/env node

/**
 * This script copies the SwiftModuleFix.xcconfig file to the iOS directory
 * to ensure it's available during the build process
 */

const fs = require('fs');
const path = require('path');

console.log('Copying SwiftModuleFix.xcconfig to iOS directory...');

// Check if iOS directory exists
const iosDir = path.resolve(process.cwd(), 'ios');
if (!fs.existsSync(iosDir)) {
  console.log('iOS directory not found. This script is only for iOS builds.');
  process.exit(0);
}

// Check if source file exists
const sourceFile = path.resolve(process.cwd(), 'SwiftModuleFix.xcconfig');
if (!fs.existsSync(sourceFile)) {
  console.log('SwiftModuleFix.xcconfig not found in project root. Creating it...');
  
  // Create the file
  const xconfigContent = `
// Fix for Swift module interface verification issues
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -Onone
BUILD_LIBRARY_FOR_DISTRIBUTION = YES
DEFINES_MODULE = YES
SWIFT_VERSION = 5.0
`;
  fs.writeFileSync(sourceFile, xconfigContent);
  console.log('Created SwiftModuleFix.xcconfig in project root');
}

// Copy the file to iOS directory
const targetFile = path.resolve(iosDir, 'SwiftModuleFix.xcconfig');
fs.copyFileSync(sourceFile, targetFile);
console.log('Copied SwiftModuleFix.xcconfig to iOS directory successfully!');
