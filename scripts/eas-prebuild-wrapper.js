#!/usr/bin/env node

/**
 * This is a comprehensive wrapper script for EAS builds.
 * It handles the platform separately to avoid the "unknown or unexpected option: --platform" error
 * that occurs when chaining multiple commands in eas.json prebuildCommand.
 * 
 * This script ensures all necessary steps are run in the correct order:
 * 1. First runs all preparation scripts
 * 2. Then runs the prebuild hook
 * 3. Finally runs expo prebuild with the correct platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('======================================');
console.log('STARTING EAS PREBUILD WRAPPER PROCESS');
console.log('======================================');

// Determine platform (default to iOS if not specified)
const platform = process.env.EAS_BUILD_PLATFORM || 'ios';
console.log(`Detected platform: ${platform}`);

// Helper function to run a script with error handling
function runScript(scriptPath, optional = false) {
  try {
    console.log(`Running ${path.basename(scriptPath)}...`);
    execSync(`node ${scriptPath}`, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    return true;
  } catch (error) {
    if (optional) {
      console.log(`Note: ${path.basename(scriptPath)} failed or not found, continuing...`);
      return false;
    } else {
      console.error(`Error running ${path.basename(scriptPath)}:`, error);
      throw error;
    }
  }
}

try {
  // Step 1: Run setup-build.js if it exists
  const setupBuildPath = path.join(process.cwd(), 'setup-build.js');
  if (fs.existsSync(setupBuildPath)) {
    runScript(setupBuildPath);
  }

  // Step 2: iOS-specific preparation scripts
  if (platform === 'ios') {
    console.log('Running iOS-specific preparation scripts...');
    
    // Run iOS-specific scripts in correct order
    const scriptsDir = path.join(process.cwd(), 'scripts');
    runScript(path.join(scriptsDir, 'fix-ios-pods.js'));
    runScript(path.join(scriptsDir, 'fix-firebase-swift.js'));
    runScript(path.join(scriptsDir, 'fix-swift-interface.js'));
    runScript(path.join(scriptsDir, 'copy-swift-config.js'));
    
    // Optional script that might not exist in all environments
    runScript(path.join(scriptsDir, 'fix-script-permissions.js'), true);
  }
  
  // Step 3: Run the prebuild hook
  console.log('Running prebuild hook...');
  const prebuildPath = path.join(process.cwd(), 'hooks', 'prebuild.js');
  runScript(prebuildPath);
  
  // Step 4: Run expo prebuild with the correct platform
  // THIS IS THE CRITICAL STEP - must be run as a separate command, not chained with &&
  console.log(`Running expo prebuild for ${platform}...`);
  const prebuildCommand = `npx expo prebuild --platform ${platform}`;
  console.log(`Executing: ${prebuildCommand}`);
  execSync(prebuildCommand, { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('======================================');
  console.log('EAS PREBUILD WRAPPER COMPLETED SUCCESSFULLY');
  console.log('======================================');
} catch (error) {
  console.error('======================================');
  console.error('ERROR IN EAS PREBUILD WRAPPER PROCESS');
  console.error('======================================');
  console.error(error);
  process.exit(1);
}
