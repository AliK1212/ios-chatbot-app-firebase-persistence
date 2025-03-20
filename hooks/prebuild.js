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

// Fix Firebase pod dependencies if building for iOS
if (platform === 'ios') {
  try {
    console.log('Fixing Firebase pod dependencies...');
    
    // Create a direct fix for the Podfile if it exists
    const iosDir = path.join(__dirname, '..', 'ios');
    if (fs.existsSync(iosDir)) {
      const podfilePath = path.join(iosDir, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        console.log(' Directly modifying Podfile to add use_modular_headers!');
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Add use_modular_headers! directive if not already present
        if (!podfileContent.includes('use_modular_headers!')) {
          podfileContent = podfileContent.replace(
            /platform :ios.+\n/,
            (match) => `${match}use_modular_headers!\n`
          );
          fs.writeFileSync(podfilePath, podfileContent);
          console.log(' Successfully added use_modular_headers! to Podfile');
        } else {
          console.log(' use_modular_headers! already present in Podfile');
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
    require('../scripts/fix-firebase-pods');
    console.log(' Firebase pod dependencies fixed');
  } catch (error) {
    console.error(' Error fixing Firebase pod dependencies:', error);
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
