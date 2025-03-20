/**
 * Deploy Firestore Rules Script
 * 
 * This script deploys the Firestore security rules to your Firebase project.
 * It requires the Firebase CLI to be installed and logged in.
 * 
 * Usage:
 * node scripts/deploy-firestore-rules.js
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the firestore.rules file
const rulesPath = path.join(__dirname, '..', 'firebase', 'firestore.rules');

// Check if the file exists
if (!fs.existsSync(rulesPath)) {
  console.error('❌ Error: firestore.rules file not found at:', rulesPath);
  process.exit(1);
}

console.log('📝 Deploying Firestore security rules...');

// Execute the Firebase CLI command to deploy only Firestore rules
exec('firebase deploy --only firestore:rules', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error deploying Firestore rules:', error.message);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log(stdout);
  console.log('✅ Firestore security rules deployed successfully!');
  console.log('\n🔍 You can verify the rules in the Firebase Console:');
  console.log('   https://console.firebase.google.com/project/_/firestore/rules');
});
