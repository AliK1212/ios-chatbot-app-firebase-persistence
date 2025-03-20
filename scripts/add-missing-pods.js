#!/usr/bin/env node

/**
 * This script adds missing React Native dependencies to the Podfile
 * It should be run during the prebuild process for iOS builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Adding missing React Native dependencies to Podfile...');

try {
  // Check if we're in an iOS build environment
  const iosDir = path.join(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, skipping Podfile modification');
    process.exit(0);
  }

  const podfilePath = path.join(iosDir, 'Podfile');
  if (!fs.existsSync(podfilePath)) {
    console.log('Podfile not found, skipping Podfile modification');
    process.exit(0);
  }

  // Read the Podfile
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');

  // Check if the Podfile already has the React-jsinspector dependency
  if (!podfileContent.includes('React-jsinspector')) {
    console.log('Adding React-jsinspector dependency to Podfile...');
    
    // Find the position to insert the dependency
    const insertPosition = podfileContent.indexOf('pod \'RCT-Folly\'');
    if (insertPosition !== -1) {
      // Insert the dependency before RCT-Folly
      const newPodfileContent = 
        podfileContent.slice(0, insertPosition) + 
        '  pod \'React-jsinspector\', :path => \'../node_modules/react-native/ReactCommon/jsinspector\'\n\n  ' + 
        podfileContent.slice(insertPosition);
      
      // Write the updated Podfile
      fs.writeFileSync(podfilePath, newPodfileContent);
      console.log('Successfully added React-jsinspector dependency to Podfile');
    } else {
      console.log('Could not find position to insert React-jsinspector dependency');
    }
  } else {
    console.log('React-jsinspector dependency already exists in Podfile');
  }

  // Add other missing dependencies if needed
  const missingDependencies = [
    { name: 'React-callinvoker', path: '../node_modules/react-native/ReactCommon/callinvoker' },
    { name: 'React-runtimeexecutor', path: '../node_modules/react-native/ReactCommon/runtimeexecutor' },
    { name: 'React-perflogger', path: '../node_modules/react-native/ReactCommon/reactperflogger' },
    { name: 'React-logger', path: '../node_modules/react-native/ReactCommon/logger' },
    { name: 'ReactCommon/turbomodule/core', path: '../node_modules/react-native/ReactCommon' },
    { name: 'Yoga', path: '../node_modules/react-native/ReactCommon/yoga' }
  ];

  for (const dep of missingDependencies) {
    if (!podfileContent.includes(`pod '${dep.name}'`)) {
      console.log(`Adding ${dep.name} dependency to Podfile...`);
      
      // Find the position to insert the dependency
      const insertPosition = podfileContent.indexOf('pod \'RCT-Folly\'');
      if (insertPosition !== -1) {
        // Insert the dependency before RCT-Folly
        const newPodfileContent = 
          podfileContent.slice(0, insertPosition) + 
          `  pod '${dep.name}', :path => '${dep.path}'\n\n  ` + 
          podfileContent.slice(insertPosition);
        
        // Write the updated Podfile
        fs.writeFileSync(podfilePath, newPodfileContent);
        podfileContent = newPodfileContent;
        console.log(`Successfully added ${dep.name} dependency to Podfile`);
      } else {
        console.log(`Could not find position to insert ${dep.name} dependency`);
      }
    } else {
      console.log(`${dep.name} dependency already exists in Podfile`);
    }
  }

  console.log('Finished adding missing React Native dependencies to Podfile');
} catch (error) {
  console.error('Error adding missing React Native dependencies to Podfile:', error);
  process.exit(1);
}
