#!/usr/bin/env node

/**
 * This script runs before the prebuild process in EAS Build
 * It prepares the environment for building without using patch-package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml'); // Required for parsing YAML files

/**
 * Expo prebuild hook that runs before the native code generation
 * @param {Object} config - The Expo config object
 * @param {Object} props - Additional properties
 * @returns {Object} - The modified config
 */
module.exports = async (config, props) => {
  console.log('Running prebuild hook...');
  
  // Determine platform from EAS_BUILD_PLATFORM, props, or command line args
  // We prioritize in this order to ensure the platform is always correctly detected
  let platform = process.env.EAS_BUILD_PLATFORM;
  
  if (!platform && props && props.platform) {
    platform = props.platform;
  }
  
  // Default to iOS if no platform is detected
  if (!platform) {
    // Check command line args for platform
    const args = process.argv.slice(2);
    const platformIndex = args.indexOf('--platform');
    if (platformIndex !== -1 && args[platformIndex + 1]) {
      platform = args[platformIndex + 1];
    } else {
      platform = 'ios'; // Default fallback
    }
  }
  
  console.log(`Platform detected: ${platform}`);
  
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
      
      // Create iOS directory if it doesn't exist
      if (!fs.existsSync(path.join(process.cwd(), 'ios'))) {
        fs.mkdirSync(path.join(process.cwd(), 'ios'), { recursive: true });
      }
      
      // Write the Podfile.properties.json file
      fs.writeFileSync(podfilePropertiesPath, JSON.stringify(podfileProperties, null, 2));
      console.log('Created Podfile.properties.json');
      
      // Update firebase.json to set modular_headers: true
      const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
      let firebaseJson = {};
      
      if (fs.existsSync(firebaseJsonPath)) {
        try {
          firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
        } catch (err) {
          console.log('Error parsing firebase.json, creating a new one');
          firebaseJson = {};
        }
      }
      
      firebaseJson.react_native = {
        ...firebaseJson.react_native,
        modular_headers: true
      };
      
      fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));
      console.log('Updated firebase.json with modular_headers: true');
      
      // Create or update SwiftModuleFix.xcconfig file
      const swiftModuleFixPath = path.join(process.cwd(), 'SwiftModuleFix.xcconfig');
      const swiftModuleFixContent = `
// Fix for Swift module interface verification issues
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_OPTIMIZATION_LEVEL = -Onone
BUILD_LIBRARY_FOR_DISTRIBUTION = YES
DEFINES_MODULE = YES
SWIFT_VERSION = 5.0
`;
      
      fs.writeFileSync(swiftModuleFixPath, swiftModuleFixContent);
      console.log('Created SwiftModuleFix.xcconfig');
      
      // Also create it in the iOS directory
      const swiftModuleFixIosPath = path.join(process.cwd(), 'ios', 'SwiftModuleFix.xcconfig');
      fs.writeFileSync(swiftModuleFixIosPath, swiftModuleFixContent);
      console.log('Created SwiftModuleFix.xcconfig in iOS directory');
      
      // Check if Podfile exists and update it
      const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        let modified = false;
        
        // Remove flipper configuration that often causes build issues
        if (podfileContent.includes(':flipper_configuration')) {
          podfileContent = podfileContent.replace(/\s*:flipper_configuration.*,/g, '');
          console.log('Removed flipper configuration from Podfile');
          modified = true;
        }
        
        // Make sure modular headers are used
        if (!podfileContent.includes('use_modular_headers!')) {
          podfileContent = podfileContent.replace(
            /platform :ios.*/,
            `$&\n\n# Add this line to ensure modular headers are used\nuse_modular_headers!`
          );
          console.log('Added use_modular_headers! to Podfile');
          modified = true;
        }
        
        // Make sure Firebase is set as static framework
        if (!podfileContent.includes('$RNFirebaseAsStaticFramework = true')) {
          podfileContent = podfileContent.replace(
            /platform :ios.*/,
            `$&\n\n# Set Firebase as static frameworks\n$RNFirebaseAsStaticFramework = true`
          );
          console.log('Added $RNFirebaseAsStaticFramework = true to Podfile');
          modified = true;
        }
        
        // Add Swift module interface fix to post_install hook if it's not already there
        const swiftInterfaceFix = `
  # Fix for Swift module interface verification issues
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Apply Swift module interface verification fix
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
        
        // Find post_install hook
        const postInstallPattern = /post_install do \|installer\|/;
        
        if (podfileContent.match(postInstallPattern)) {
          if (!podfileContent.includes('BUILD_LIBRARY_FOR_DISTRIBUTION')) {
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
          console.log('Updated Podfile successfully');
        }
        
        console.log('Prebuild preparation for iOS completed successfully');
      } 
    } catch (error) {
      console.error('Error during iOS prebuild preparation:', error);
      process.exit(1);
    }
  } else if (platform === 'android') {
    console.log('Android platform detected, no special prebuild steps needed');
  }
  
  console.log('Prebuild hook completed successfully');
  return config;
};
