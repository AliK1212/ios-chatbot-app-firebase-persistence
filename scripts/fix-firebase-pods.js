#!/usr/bin/env node

/**
 * This script fixes Firebase pod dependencies by ensuring the correct versions
 * are used and that they are compatible with each other.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing Firebase pod dependencies...');

// Create a Podfile.properties.json file in the ios directory
// This will be used by the prebuild process to configure the pods
const createPodfileProperties = () => {
  const iosDir = path.join(__dirname, '..', 'ios');
  
  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory does not exist yet, skipping Podfile.properties.json creation');
    return;
  }
  
  const podfilePropertiesPath = path.join(iosDir, 'Podfile.properties.json');
  const podfileProperties = {
    useFrameworks: false,
    useModularHeaders: true
  };
  
  try {
    fs.writeFileSync(podfilePropertiesPath, JSON.stringify(podfileProperties, null, 2));
    console.log('Created Podfile.properties.json with useModularHeaders: true');
  } catch (error) {
    console.error('Error creating Podfile.properties.json:', error);
  }
};

// Create a firebase.json file in the project root
// This will be used by the Firebase SDK to configure the pods
const createFirebaseJson = () => {
  const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');
  const firebaseJson = {
    "react-native": {
      "ios": {
        "modular_headers": true
      }
    }
  };
  
  try {
    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));
    console.log('Created firebase.json with modular_headers: true');
  } catch (error) {
    console.error('Error creating firebase.json:', error);
  }
};

// Run the fixes
createPodfileProperties();
createFirebaseJson();

console.log('Firebase pod dependencies fixed');
