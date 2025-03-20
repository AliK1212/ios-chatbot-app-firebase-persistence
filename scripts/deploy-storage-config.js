/**
 * Script to deploy Firebase Storage rules and CORS configuration
 * 
 * Usage:
 * 1. Make sure you have Firebase CLI installed: npm install -g firebase-tools
 * 2. Login to Firebase: firebase login
 * 3. Run this script: node scripts/deploy-storage-config.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get project directory
const projectDir = path.resolve(__dirname, '..');

// Deploy Storage Rules
console.log('Deploying Firebase Storage Rules...');
try {
  execSync('firebase deploy --only storage', { 
    cwd: projectDir,
    stdio: 'inherit'
  });
  console.log('✅ Storage rules deployed successfully!');
} catch (error) {
  console.error('❌ Failed to deploy storage rules:', error.message);
}

// Deploy CORS configuration
console.log('\nDeploying CORS configuration...');
try {
  // Check if gsutil is installed
  try {
    execSync('gsutil version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ gsutil not found. Please install Google Cloud SDK.');
    console.log('Installation instructions: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }

  // Get Firebase project ID
  let projectId;
  try {
    const firebaseRc = fs.readFileSync(path.join(projectDir, '.firebaserc'), 'utf8');
    const rcData = JSON.parse(firebaseRc);
    projectId = rcData.projects.default;
  } catch (error) {
    console.error('❌ Failed to get Firebase project ID:', error.message);
    console.log('Please specify your project ID manually in the script.');
    process.exit(1);
  }

  if (!projectId) {
    console.error('❌ No default project found in .firebaserc');
    process.exit(1);
  }

  // Deploy CORS configuration
  const corsFile = path.join(projectDir, 'cors.json');
  const bucketName = `gs://${projectId}.firebasestorage.app`;
  
  console.log(`Setting CORS configuration for bucket: ${bucketName}`);
  execSync(`gsutil cors set ${corsFile} ${bucketName}`, { 
    stdio: 'inherit'
  });
  
  console.log('✅ CORS configuration deployed successfully!');
} catch (error) {
  console.error('❌ Failed to deploy CORS configuration:', error.message);
  console.log('Please make sure you have the necessary permissions and Google Cloud SDK installed.');
}

console.log('\n✨ Deployment complete!');
console.log('\nNext steps:');
console.log('1. Test PDF access using the debug page');
console.log('2. Process your PDFs using the ProcessPdfsModal');
console.log('3. Check Firestore for generated embeddings and document metadata');
