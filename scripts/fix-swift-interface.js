#!/usr/bin/env node

/**
 * This script fixes Swift module interface verification issues in React Native iOS builds
 * Specifically targeting the FirebaseAuth module interface verification error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing Swift module interface verification issues...');

// Check if iOS directory exists
const iosDir = path.resolve(process.cwd(), 'ios');
if (!fs.existsSync(iosDir)) {
  console.log('iOS directory not found. This script is only for iOS builds.');
  process.exit(0);
}

// Create a special xcconfig file to fix Swift module interface verification issues
const xconfigPath = path.resolve(iosDir, 'SwiftModuleFix.xcconfig');
const xconfigContent = `
// Fix for Swift module interface verification issues
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -Onone
BUILD_LIBRARY_FOR_DISTRIBUTION = YES
DEFINES_MODULE = YES
SWIFT_VERSION = 5.0
`;

fs.writeFileSync(xconfigPath, xconfigContent);
console.log('Created SwiftModuleFix.xcconfig with Swift module interface verification fixes');

// Update Podfile to include the xcconfig file
const podfilePath = path.resolve(iosDir, 'Podfile');
if (fs.existsSync(podfilePath)) {
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  let modified = false;

  // Add import for the xcconfig file if not present
  if (!podfileContent.includes('SwiftModuleFix.xcconfig')) {
    podfileContent = podfileContent.replace(
      /platform :ios.+\n/,
      (match) => `${match}require_relative 'SwiftModuleFix.xcconfig'\n`
    );
    modified = true;
    console.log('Added import for SwiftModuleFix.xcconfig to Podfile');
  }

  // Add explicit dependencies for FirebaseAuth if not present
  const firebaseDependencies = [
    "pod 'FirebaseCore', :modular_headers => true",
    "pod 'FirebaseAppCheckInterop', :modular_headers => true",
    "pod 'FirebaseCoreExtension', :modular_headers => true",
    "pod 'GTMSessionFetcher', :modular_headers => true",
    "pod 'RecaptchaInterop', :modular_headers => true"
  ];

  let dependenciesAdded = false;
  for (const dependency of firebaseDependencies) {
    if (!podfileContent.includes(dependency)) {
      dependenciesAdded = true;
    }
  }

  if (dependenciesAdded) {
    podfileContent = podfileContent.replace(
      "pod 'FirebaseAuth', :modular_headers => true",
      "pod 'FirebaseAuth', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseAppCheckInterop', :modular_headers => true\n  pod 'FirebaseCoreExtension', :modular_headers => true\n  pod 'GTMSessionFetcher', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true"
    );
    modified = true;
    console.log('Added explicit dependencies for FirebaseAuth to Podfile');
  }

  // Enhanced post_install hook for Swift module interface verification
  if (!podfileContent.includes('SWIFT_COMPILATION_MODE')) {
    const postInstallPattern = /post_install\s+do\s+\|installer\|/;
    if (postInstallPattern.test(podfileContent)) {
      const swiftInterfaceFix = `
  # Fix for Swift module interface verification
  installer.pods_project.build_configurations.each do |config|
    config.build_settings.merge!(YAML.load_file('SwiftModuleFix.xcconfig'))
  end
`;
      podfileContent = podfileContent.replace(
        postInstallPattern,
        `post_install do |installer|\n${swiftInterfaceFix}`
      );
      modified = true;
      console.log('Added Swift module interface verification fix to post_install hook');
    }
  }

  if (modified) {
    fs.writeFileSync(podfilePath, podfileContent);
    console.log('Updated Podfile with Swift module interface verification fixes');
  }
}

console.log('Swift module interface verification issues fixed successfully!');
