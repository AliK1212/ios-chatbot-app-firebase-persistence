#!/usr/bin/env node

/**
 * This script runs before the prebuild process in EAS Build
 * It prepares the environment for building without using patch-package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Log start of setup
console.log('Running prebuild hook...');

// Get the platform from the context
const platform = process.env.EAS_BUILD_PLATFORM || 
                (process.argv.includes('--platform=ios') || process.argv.includes('ios') ? 'ios' : 
                 process.argv.includes('--platform=android') || process.argv.includes('android') ? 'android' : null);

if (platform) {
  console.log(`Platform: ${platform}`);
} else {
  console.log('No platform detected, continuing with general setup');
}

// Run the OpenAI browser fix script
try {
  console.log('Fixing OpenAI browser compatibility...');
  require('../fix-openai-browser');
  console.log(' OpenAI browser compatibility fixed');
} catch (error) {
  console.error(' Error fixing OpenAI browser compatibility:', error);
}

// Fix iOS pod dependencies if building for iOS
if (platform === 'ios') {
  try {
    console.log('Running iOS pod fixes...');
    
    // Run the comprehensive fix-ios-pods.js script
    try {
      console.log(' Running fix-ios-pods.js script...');
      require('../scripts/fix-ios-pods');
      console.log(' fix-ios-pods.js script completed successfully');
    } catch (error) {
      console.error(' Error running fix-ios-pods.js script:', error);
    }
    
    // Create a direct fix for the Podfile if it exists
    const iosDir = path.join(__dirname, '..', 'ios');
    if (fs.existsSync(iosDir)) {
      const podfilePath = path.join(iosDir, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        console.log(' Directly modifying Podfile to fix compatibility issues');
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        let modified = false;
        
        // Remove any Flipper configuration - it's no longer supported in React Native 0.74
        if (podfileContent.includes('flipper_configuration')) {
          console.log(' Removing Flipper configuration from Podfile');
          podfileContent = podfileContent.replace(
            /\s*:flipper_configuration\s*=>\s*[^,]+,/g,
            ''
          );
          modified = true;
          console.log(' Removed Flipper configuration from Podfile');
        }
        
        // Add use_modular_headers! directive if not already present
        if (!podfileContent.includes('use_modular_headers!')) {
          console.log(' Adding use_modular_headers! to Podfile');
          podfileContent = podfileContent.replace(
            /platform :ios.+\n/,
            (match) => `${match}use_modular_headers!\n`
          );
          modified = true;
          console.log(' Added use_modular_headers! to Podfile');
        }
        
        if (modified) {
          fs.writeFileSync(podfilePath, podfileContent);
          console.log(' Successfully updated Podfile');
        }
      }
      
      // Create Podfile.properties.json
      const podfilePropertiesPath = path.join(iosDir, 'Podfile.properties.json');
      const podfileProperties = {
        'ios.deploymentTarget': '15.1', 
        'useModularHeaders': true
      };
      fs.writeFileSync(
        podfilePropertiesPath, 
        JSON.stringify(podfileProperties, null, 2)
      );
      console.log(' Created Podfile.properties.json with useModularHeaders: true and deploymentTarget: 15.1');
    }
    
    // Update CocoaPods repositories
    try {
      console.log(' Cleaning CocoaPods cache...');
      require('../scripts/clean-cocoapods-cache');
      console.log(' CocoaPods cache cleaned');
      
      console.log(' Updating CocoaPods repositories...');
      require('../scripts/update-cocoapods-repos');
      console.log(' CocoaPods repositories updated');
    } catch (error) {
      console.error(' Error updating CocoaPods repositories:', error);
    }
    
    // Run the fix-firebase-pods script
    try {
      console.log(' Running fix-firebase-pods script...');
      require('../scripts/fix-firebase-pods');
      console.log(' Firebase pod dependencies fixed');
    } catch (error) {
      console.error(' Error fixing Firebase pod dependencies:', error);
    }
    
    console.log('iOS pod fixes completed');
  } catch (error) {
    console.error('Error during iOS pod fixes:', error);
  }
}

// Remove patches directory to prevent patch-package from running
const patchesDir = path.join(__dirname, '..', 'patches');
if (fs.existsSync(patchesDir)) {
  console.log('Removing patches directory to prevent patch-package from running...');
  try {
    fs.rmSync(patchesDir, { recursive: true, force: true });
    console.log(' Patches directory removed');
  } catch (error) {
    console.error(' Error removing patches directory:', error);
  }
}

console.log('Prebuild hook completed successfully');
