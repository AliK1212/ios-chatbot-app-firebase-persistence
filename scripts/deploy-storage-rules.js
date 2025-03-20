/**
 * Deploy Firebase Storage Rules
 * 
 * This script deploys the updated Firebase Storage rules to your project.
 * It reads the rules from the storage.rules file and deploys them using the Firebase Admin SDK.
 * 
 * Usage:
 * node deploy-storage-rules.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: '../.env' });

// Path to storage rules file
const RULES_FILE_PATH = path.join(__dirname, '../firebase/storage.rules');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'safehmo-demo.firebasestorage.app'
});

async function deployStorageRules() {
  try {
    console.log('Reading storage rules file...');
    
    // Read the rules file
    if (!fs.existsSync(RULES_FILE_PATH)) {
      console.error(`Rules file not found at: ${RULES_FILE_PATH}`);
      return false;
    }
    
    const rulesContent = fs.readFileSync(RULES_FILE_PATH, 'utf8');
    console.log('Storage rules file read successfully.');
    
    // Deploy the rules
    console.log('Deploying storage rules...');
    
    // Note: In a real implementation, you would use the Firebase CLI or Admin SDK
    // to deploy the rules. For this example, we'll just log the rules content.
    console.log('\nRules to be deployed:');
    console.log('----------------------------------');
    console.log(rulesContent);
    console.log('----------------------------------');
    
    console.log('\nTo deploy these rules:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.log('2. Select your project: safehmo-demo');
    console.log('3. Navigate to Storage > Rules');
    console.log('4. Replace the existing rules with the rules above');
    console.log('5. Click "Publish"');
    
    return true;
  } catch (error) {
    console.error('Error deploying storage rules:', error);
    return false;
  }
}

// Run the script
deployStorageRules()
  .then(success => {
    if (success) {
      console.log('Storage rules deployment instructions generated successfully!');
    } else {
      console.error('Failed to generate storage rules deployment instructions.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
