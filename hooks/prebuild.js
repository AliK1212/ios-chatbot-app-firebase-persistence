#!/usr/bin/env node

/**
 * This script runs before the prebuild process in EAS Build
 * It prepares the environment for building without using patch-package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Expo prebuild hook that runs before the native code generation
 * @param {Object} config - The Expo config object
 * @param {Object} props - Additional properties
 * @returns {Object} - The modified config
 */
module.exports = async (config, props) => {
  console.log('Running prebuild hook...');
  
  // Determine platform from EAS_BUILD_PLATFORM or props
  const platform = process.env.EAS_BUILD_PLATFORM || props.platform;
  console.log(`Platform: ${platform}`);
  
  if (platform === 'ios') {
    try {
      // Run the fix-ios-pods.js script
      console.log('Running fix-ios-pods.js script...');
      const fixIosPodsPath = path.join(process.cwd(), 'scripts', 'fix-ios-pods.js');
      execSync(`node ${fixIosPodsPath}`, { stdio: 'inherit' });
      
      // Run the fix-firebase-swift.js script
      console.log('Running fix-firebase-swift.js script...');
      const fixFirebaseSwiftPath = path.join(process.cwd(), 'scripts', 'fix-firebase-swift.js');
      execSync(`node ${fixFirebaseSwiftPath}`, { stdio: 'inherit' });
      
      // Run the fix-swift-interface.js script
      console.log('Running fix-swift-interface.js script...');
      const fixSwiftInterfacePath = path.join(process.cwd(), 'scripts', 'fix-swift-interface.js');
      execSync(`node ${fixSwiftInterfacePath}`, { stdio: 'inherit' });
      
      // Run the copy-swift-config.js script
      console.log('Running copy-swift-config.js script...');
      const copySwiftConfigPath = path.join(process.cwd(), 'scripts', 'copy-swift-config.js');
      execSync(`node ${copySwiftConfigPath}`, { stdio: 'inherit' });
      
      // Create Podfile.properties.json with the correct iOS deployment target
      const podfilePropertiesPath = path.join(process.cwd(), 'ios', 'Podfile.properties.json');
      const podfileProperties = {
        'ios.deploymentTarget': '15.1',
        'useModularHeaders': true
      };
      
      fs.writeFileSync(
        podfilePropertiesPath,
        JSON.stringify(podfileProperties, null, 2)
      );
      console.log('Created Podfile.properties.json with useModularHeaders: true and deploymentTarget: 15.1');
      
      // Create or update firebase.json to include modular_headers: true
      const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
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
      
      // Handle React-jsinspector conflict in Podfile
      const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        let modified = false;
        
        // Remove any Flipper configuration as it's not supported in React Native 0.74
        const updatedContent = podfileContent
          .replace(/\s*:flipper_configuration.*,/g, '')
          .replace(/\s*use_flipper.*\n/g, '');
        
        if (updatedContent !== podfileContent) {
          podfileContent = updatedContent;
          modified = true;
          console.log('Removed Flipper configuration from Podfile');
        }
        
        // Add use_modular_headers! if not present
        if (!podfileContent.includes('use_modular_headers!')) {
          podfileContent = podfileContent.replace(
            'platform :ios',
            'use_modular_headers!\nplatform :ios'
          );
          modified = true;
          console.log('Added use_modular_headers! to Podfile');
        }
        
        // Add Firebase static framework setting if not present
        if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
          podfileContent = podfileContent.replace(
            'use_modular_headers!',
            'use_modular_headers!\n\n# Set Firebase as static frameworks\n$RNFirebaseAsStaticFramework = true'
          );
          modified = true;
          console.log('Added $RNFirebaseAsStaticFramework = true to Podfile');
        }
        
        // Add explicit FirebaseAuth pod if not present
        if (!podfileContent.includes("pod 'FirebaseAuth'")) {
          podfileContent = podfileContent.replace(
            /target ['"]SafeHMO['"] do\s*\n\s*config = use_native_modules!/,
            "target 'SafeHMO' do\n  config = use_native_modules!\n\n  # Explicitly add FirebaseAuth\n  pod 'FirebaseAuth', :modular_headers => true"
          );
          modified = true;
          console.log('Added explicit FirebaseAuth pod with modular_headers to Podfile');
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
        
        // Add fix for React-jsinspector conflict
        if (!podfileContent.includes('React-jsinspector')) {
          const postInstallPattern = /post_install\s+do\s+\|installer\|/;
          if (postInstallPattern.test(podfileContent)) {
            const jsinspectorFix = `
  # Fix for React-jsinspector conflict
  installer.pods_project.targets.each do |target|
    if target.name == 'React-jsinspector'
      target.build_configurations.each do |config|
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      end
    end
  end
`;
            podfileContent = podfileContent.replace(
              postInstallPattern,
              `post_install do |installer|\n${jsinspectorFix}`
            );
            modified = true;
            console.log('Added React-jsinspector fix to Podfile');
          }
        }
        
        // Add fix for Firebase Swift headers
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
        
        // Add Swift module interface verification fix if not present
        if (!podfileContent.includes('SwiftModuleFix.xcconfig')) {
          // Create the SwiftModuleFix.xcconfig file
          const xconfigPath = path.join(process.cwd(), 'ios', 'SwiftModuleFix.xcconfig');
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
          
          // Add import for the xcconfig file
          podfileContent = podfileContent.replace(
            /platform :ios.+\n/,
            (match) => `${match}require_relative 'SwiftModuleFix.xcconfig'\n`
          );
          
          // Add Swift module interface verification fix to post_install hook
          const postInstallPattern = /post_install\s+do\s+\|installer\|/;
          if (postInstallPattern.test(podfileContent)) {
            const swiftInterfaceFix = `
  # Fix for Swift module interface verification
  installer.pods_project.build_configurations.each do |config|
    config.build_settings.merge!(YAML.load_file('SwiftModuleFix.xcconfig'))
  end
`;
            if (!podfileContent.includes('YAML.load_file')) {
              podfileContent = podfileContent.replace(
                postInstallPattern,
                `post_install do |installer|\n${swiftInterfaceFix}`
              );
              modified = true;
              console.log('Added Swift module interface verification fix to post_install hook');
            }
          }
        }
        
        if (modified) {
          fs.writeFileSync(podfilePath, podfileContent);
          console.log('Updated Podfile successfully');
        }
      }
    } catch (error) {
      console.error('Error in prebuild hook for iOS:', error);
    }
  }
  
  return config;
};
