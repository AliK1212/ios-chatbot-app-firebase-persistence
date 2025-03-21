#!/usr/bin/env node

/**
 * This script fixes Swift module interface verification issues in React Native iOS builds
 * Specifically targeting the FirebaseAuth module interface verification error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml'); // Required for parsing YAML files

console.log('Fixing Swift module interface verification issues...');

// Check if iOS directory exists
const iosDir = path.join(process.cwd(), 'ios');
const hasIosDir = fs.existsSync(iosDir);

// Create SwiftModuleFix.xcconfig
const xconfigContent = `// Fix for Swift module interface verification issues
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -Onone
BUILD_LIBRARY_FOR_DISTRIBUTION = YES
DEFINES_MODULE = YES
SWIFT_VERSION = 5.0
`;

// Create the xcconfig file in the project root and in the iOS directory if it exists
const rootXconfigPath = path.join(process.cwd(), 'SwiftModuleFix.xcconfig');
fs.writeFileSync(rootXconfigPath, xconfigContent);
console.log('Created SwiftModuleFix.xcconfig in project root');

if (hasIosDir) {
  const iosXconfigPath = path.join(iosDir, 'SwiftModuleFix.xcconfig');
  fs.writeFileSync(iosXconfigPath, xconfigContent);
  console.log('Created SwiftModuleFix.xcconfig in iOS directory');
}

// Update firebase.json
function updateFirebaseJson() {
  const firebaseJsonPath = path.resolve(process.cwd(), 'firebase.json');
  let firebaseConfig = {};

  if (fs.existsSync(firebaseJsonPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    } catch (e) {
      console.log('Error parsing firebase.json, creating a new one');
      firebaseConfig = {};
    }
  }

  // Ensure the react-native.ios.modular_headers setting exists
  firebaseConfig['react-native'] = firebaseConfig['react-native'] || {};
  firebaseConfig['react-native']['ios'] = firebaseConfig['react-native']['ios'] || {};
  firebaseConfig['react-native']['ios']['modular_headers'] = true;

  fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  console.log('Updated firebase.json with modular_headers: true');
}

// Update ios-podfile-template.rb if it exists
function updatePodfileTemplate() {
  const podfileTemplatePath = path.resolve(process.cwd(), 'ios-podfile-template.rb');
  if (fs.existsSync(podfileTemplatePath)) {
    let podfileContent = fs.readFileSync(podfileTemplatePath, 'utf8');
    let modified = false;

    // Add import for the xcconfig file if not present
    if (!podfileContent.includes('SwiftModuleFix.xcconfig')) {
      podfileContent = podfileContent.replace(
        /platform :ios.+\n/,
        (match) => `${match}# Import Swift module fix configuration\nrequire_relative 'SwiftModuleFix.xcconfig'\n`
      );
      modified = true;
      console.log('Added import for SwiftModuleFix.xcconfig to Podfile template');
    }

    // Add explicit dependencies for FirebaseAuth if not present
    if (!podfileContent.includes("pod 'FirebaseAppCheckInterop'")) {
      podfileContent = podfileContent.replace(
        "pod 'FirebaseAuth', :modular_headers => true",
        "pod 'FirebaseAuth', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseAppCheckInterop', :modular_headers => true\n  pod 'FirebaseCoreExtension', :modular_headers => true\n  pod 'GTMSessionFetcher', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true"
      );
      modified = true;
      console.log('Added explicit dependencies for FirebaseAuth to Podfile template');
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
        console.log('Added Swift module interface verification fix to post_install hook in Podfile template');
      }
    }

    if (modified) {
      fs.writeFileSync(podfileTemplatePath, podfileContent);
      console.log('Updated Podfile template with Swift module interface verification fixes');
    }
  } else {
    console.log('Podfile template not found. Please create ios-podfile-template.rb first.');
  }
}

// Update Podfile
function updatePodfile() {
  const podfilePath = path.resolve(iosDir, 'Podfile');
  if (fs.existsSync(podfilePath)) {
    let podfileContent = fs.readFileSync(podfilePath, 'utf8');
    let modified = false;

    // Add import for the xcconfig file if not present
    if (!podfileContent.includes('SwiftModuleFix.xcconfig')) {
      podfileContent = podfileContent.replace(
        /platform :ios.+\n/,
        (match) => `${match}# Import Swift module fix configuration\nrequire_relative 'SwiftModuleFix.xcconfig'\n`
      );
      modified = true;
      console.log('Added import for SwiftModuleFix.xcconfig to Podfile');
    }

    // Add explicit dependencies for FirebaseAuth if not present
    if (!podfileContent.includes("pod 'FirebaseAppCheckInterop'")) {
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
}

if (!hasIosDir) {
  console.log('iOS directory not found. Updating template files instead.');
  
  // Update firebase.json
  updateFirebaseJson();
  
  // Update ios-podfile-template.rb if it exists
  updatePodfileTemplate();
  
  console.log('Swift module interface verification issues fixed in template files!');
  process.exit(0);
}

// If iOS directory exists, continue with normal operation
updatePodfile();

console.log('Swift module interface verification issues fixed successfully!');
