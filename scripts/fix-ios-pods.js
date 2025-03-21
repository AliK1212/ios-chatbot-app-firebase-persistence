#!/usr/bin/env node

/**
 * This script is specifically designed to run as the prebuildCommand in eas.json
 * It handles all the necessary steps to fix CocoaPods issues for iOS builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting iOS CocoaPods fix script...');

// Parse command line arguments but ignore them - this allows the script to be called with --platform ios
// without failing, as it's already specifically for iOS
const args = process.argv.slice(2);
console.log(`Received arguments: ${args.join(' ')} (these will be ignored as this script is iOS-specific)`);

// Check if we're being called with 'npx expo node' and handle accordingly
// This is a special case for EAS Build which might call the script this way
if (args.length > 0 && args[0] === '--platform') {
  console.log('Detected --platform argument, continuing with iOS-specific script...');
  // No need to do anything special, just continue with the script
}

try {
  // Check if we're in an iOS build environment
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, creating it...');
    fs.mkdirSync(iosDir, { recursive: true });
  }

  // Fix Podfile if it exists
  const podfilePath = path.join(iosDir, 'Podfile');
  if (fs.existsSync(podfilePath)) {
    console.log('Checking Podfile for compatibility issues...');
    let podfileContent = fs.readFileSync(podfilePath, 'utf8');
    let modified = false;
    
    // Remove any Flipper configuration - it's no longer supported in React Native 0.74
    podfileContent = podfileContent.replace(/\s*:flipper_configuration.*,/g, '');
    podfileContent = podfileContent.replace(/\s*use_flipper.*\n/g, '');
    
    // Add use_modular_headers! if not present
    if (!podfileContent.includes('use_modular_headers!')) {
      podfileContent = podfileContent.replace(
        'platform :ios',
        'use_modular_headers!\nplatform :ios'
      );
      modified = true;
    }
    
    // Add Firebase static framework setting if not present
    if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
      podfileContent = podfileContent.replace(
        'use_modular_headers!',
        'use_modular_headers!\n\n# Set Firebase as static frameworks\n$RNFirebaseAsStaticFramework = true'
      );
      modified = true;
    }
    
    // Add explicit FirebaseAuth pod if not present
    if (!podfileContent.includes("pod 'FirebaseAuth'")) {
      podfileContent = podfileContent.replace(
        /target ['"]SafeHMO['"] do\s*\n\s*config = use_native_modules!/,
        "target 'SafeHMO' do\n  config = use_native_modules!\n\n  # Explicitly add FirebaseAuth\n  pod 'FirebaseAuth', :modular_headers => true"
      );
      modified = true;
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
      }
    }
    
    // Add fix for Firebase Swift headers
    if (!podfileContent.includes('BUILD_LIBRARY_FOR_DISTRIBUTION')) {
      const postInstallPattern = /installer\.pods_project\.targets\.each do \|target\|.*?end/s;
      if (postInstallPattern.test(podfileContent)) {
        const firebaseSwiftFix = `
      # Fix for Firebase Swift headers
      if ['FirebaseAuth', 'FirebaseCore', 'FirebaseFirestore', 'FirebaseStorage'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
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
      }
    }
    
    if (modified) {
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('Updated Podfile to fix Firebase Swift headers and other issues');
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
  console.log('Created Podfile.properties.json with useModularHeaders: true and deploymentTarget: 15.1');

  // Clean CocoaPods cache
  console.log('Cleaning CocoaPods cache...');
  try {
    execSync('pod cache clean --all', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('CocoaPods cache cleaned successfully');
  } catch (error) {
    console.log('Error cleaning CocoaPods cache, but continuing:', error.message);
  }

  // Add the trunk repo
  console.log('Setting up CocoaPods trunk repository...');
  try {
    execSync('pod repo add trunk https://cdn.cocoapods.org/ || true', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('Successfully set up trunk repository');
  } catch (error) {
    console.log('Trunk repository already exists or error adding it, but continuing:', error.message);
  }
  
  // Update the repos
  console.log('Updating CocoaPods repositories...');
  try {
    execSync('pod repo update', { 
      cwd: iosDir,
      stdio: 'inherit'
    });
    console.log('Successfully updated CocoaPods repositories');
  } catch (error) {
    console.log('Error updating CocoaPods repositories, but continuing:', error.message);
  }
  
  // Fix Firebase pods if needed
  console.log('Fixing Firebase pods...');
  try {
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
  } catch (error) {
    console.log('Error fixing Firebase pods, but continuing:', error.message);
  }

  console.log('iOS CocoaPods fix script completed successfully');
} catch (error) {
  console.error('Error in iOS CocoaPods fix script:', error);
  process.exit(1);
}
