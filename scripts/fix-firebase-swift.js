#!/usr/bin/env node

/**
 * This script fixes issues with Firebase Swift headers in React Native iOS builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing Firebase Swift header issues...');

// Check if iOS directory exists
const iosDir = path.resolve(process.cwd(), 'ios');
if (!fs.existsSync(iosDir)) {
  console.log('iOS directory not found. This script is only for iOS builds.');
  process.exit(0);
}

// Create Podfile.properties.json with the correct iOS deployment target and modular headers
const podfilePropertiesPath = path.resolve(iosDir, 'Podfile.properties.json');
const podfileProperties = {
  'ios.deploymentTarget': '15.1',
  'useModularHeaders': true
};

fs.writeFileSync(
  podfilePropertiesPath,
  JSON.stringify(podfileProperties, null, 2)
);
console.log('Created Podfile.properties.json with useModularHeaders: true');

// Create or update firebase.json to include modular_headers: true
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

// Fix Podfile if it exists
const podfilePath = path.resolve(iosDir, 'Podfile');
if (fs.existsSync(podfilePath)) {
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  let modified = false;

  // Add use_modular_headers! if not present
  if (!podfileContent.includes('use_modular_headers!')) {
    podfileContent = podfileContent.replace(
      'platform :ios',
      'use_modular_headers!\nplatform :ios'
    );
    modified = true;
    console.log('Added use_modular_headers! to Podfile');
  }

  // Add $RNFirebaseAsStaticFramework = true if not present
  if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
    podfileContent = podfileContent.replace(
      'use_modular_headers!',
      'use_modular_headers!\n\n# Set Firebase as static frameworks\n$RNFirebaseAsStaticFramework = true'
    );
    modified = true;
    console.log('Added $RNFirebaseAsStaticFramework = true to Podfile');
  }

  // Add explicit FirebaseAuth pod with modular_headers if not present
  if (!podfileContent.includes("pod 'FirebaseAuth'")) {
    podfileContent = podfileContent.replace(
      /target ['"]SafeHMO['"] do\s*\n\s*config = use_native_modules!/,
      "target 'SafeHMO' do\n  config = use_native_modules!\n\n  # Explicitly add FirebaseAuth\n  pod 'FirebaseAuth', :modular_headers => true"
    );
    modified = true;
    console.log('Added explicit FirebaseAuth pod with modular_headers to Podfile');
  }

  // Add explicit dependencies for FirebaseAuth
  const firebaseDependencies = [
    "pod 'FirebaseCore', :modular_headers => true",
    "pod 'FirebaseAppCheckInterop', :modular_headers => true",
    "pod 'FirebaseCoreExtension', :modular_headers => true",
    "pod 'GTMSessionFetcher', :modular_headers => true",
    "pod 'RecaptchaInterop', :modular_headers => true"
  ];

  if (!podfileContent.includes("pod 'FirebaseAppCheckInterop'")) {
    podfileContent = podfileContent.replace(
      "pod 'FirebaseAuth', :modular_headers => true",
      "pod 'FirebaseAuth', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseAppCheckInterop', :modular_headers => true\n  pod 'FirebaseCoreExtension', :modular_headers => true\n  pod 'GTMSessionFetcher', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true"
    );
    modified = true;
    console.log('Added explicit dependencies for FirebaseAuth to Podfile');
  }

  // Add fix for Firebase Swift headers in post_install hook
  if (!podfileContent.includes('BUILD_LIBRARY_FOR_DISTRIBUTION')) {
    const postInstallPattern = /installer\.pods_project\.targets\.each do \|target\|.*?end/s;
    if (postInstallPattern.test(podfileContent)) {
      const firebaseSwiftFix = `
      # Fix for Firebase Swift headers
      if ['FirebaseAuth', 'FirebaseCore', 'FirebaseFirestore', 'FirebaseStorage', 'FirebaseAppCheckInterop', 'FirebaseCoreExtension', 'GTMSessionFetcher', 'RecaptchaInterop'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
          # Add Swift compilation mode settings
          config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
          # Ensure Swift modules are properly built
          config.build_settings['DEFINES_MODULE'] = 'YES'
          # Set Swift version explicitly
          config.build_settings['SWIFT_VERSION'] = '5.0'
        end
      end
`;
      podfileContent = podfileContent.replace(
        postInstallPattern,
        (match) => {
          return match.replace(/end\s*$/, `${firebaseSwiftFix}    end`);
        }
      );
      modified = true;
      console.log('Added enhanced Swift settings for Firebase modules');
    }
  }

  if (modified) {
    fs.writeFileSync(podfilePath, podfileContent);
    console.log('Updated Podfile with Firebase Swift fixes');
  }
}

console.log('Firebase Swift header issues fixed successfully!');
