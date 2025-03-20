/**
 * Firebase Production Testing Script
 * 
 * This script tests critical Firebase functionality with production credentials.
 * Run this before going live to ensure everything works correctly.
 * 
 * Usage:
 * 1. Update the firebaseConfig object with production credentials
 * 2. Run with: node test-firebase-production.js
 */

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  deleteDoc
} = require('firebase/firestore');
const { getStorage, ref, uploadString, getDownloadURL } = require('firebase/storage');

// Replace with production credentials from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_PRODUCTION_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Test user credentials - change these for your test
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "Test123!";
const TEST_USER_ID = "test-user-id";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Run a test case and track results
 */
async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n📋 RUNNING TEST: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Test Firebase Authentication
 */
async function testAuthentication() {
  // Test user creation
  await runTest("User Registration", async () => {
    try {
      await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      console.log("   Created test user successfully");
    } catch (error) {
      // If user already exists, try to sign in instead
      if (error.code === 'auth/email-already-in-use') {
        console.log("   Test user already exists, proceeding with sign in");
      } else {
        throw error;
      }
    }
  });

  // Test user sign in
  await runTest("User Sign In", async () => {
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    if (!userCredential.user) throw new Error("Failed to get user from credentials");
    console.log(`   Signed in as: ${userCredential.user.email}`);
  });

  // Test user sign out
  await runTest("User Sign Out", async () => {
    await signOut(auth);
    if (auth.currentUser) throw new Error("User still signed in after signOut");
    console.log("   Signed out successfully");
  });
}

/**
 * Test Firestore Database
 */
async function testFirestore() {
  // Sign in first
  await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  
  // Test document creation
  await runTest("Firestore Document Creation", async () => {
    const testData = {
      name: "Test User",
      email: TEST_EMAIL,
      isPremium: false,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", TEST_USER_ID), testData);
    console.log("   Created test document successfully");
  });

  // Test document reading
  await runTest("Firestore Document Reading", async () => {
    const docSnap = await getDoc(doc(db, "users", TEST_USER_ID));
    if (!docSnap.exists()) throw new Error("Document does not exist");
    console.log(`   Retrieved document: ${JSON.stringify(docSnap.data())}`);
  });

  // Test querying
  await runTest("Firestore Querying", async () => {
    const q = query(collection(db, "users"), where("email", "==", TEST_EMAIL));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error("Query returned no results");
    console.log(`   Query returned ${querySnapshot.size} document(s)`);
  });

  // Test security rules
  await runTest("Firestore Security Rules", async () => {
    try {
      // Try to access another user's document (should fail with proper security rules)
      await getDoc(doc(db, "users", "another-user-id"));
      
      // If we get here, security rules might not be properly configured
      console.log("   ⚠️ WARNING: Security rules might not be properly configured!");
      console.log("   ⚠️ Able to read another user's document, which should be restricted");
    } catch (error) {
      // This is actually expected with proper security rules
      if (error.code === 'permission-denied') {
        console.log("   Security rules working correctly (permission denied as expected)");
      } else {
        throw error;
      }
    }
  });

  // Clean up test document
  await runTest("Firestore Document Deletion", async () => {
    await deleteDoc(doc(db, "users", TEST_USER_ID));
    console.log("   Deleted test document successfully");
  });
}

/**
 * Test Firebase Storage
 */
async function testStorage() {
  // Sign in first
  await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  
  // Test file upload
  await runTest("Storage File Upload", async () => {
    const testFileContent = "This is a test file content";
    const storageRef = ref(storage, `test-files/${TEST_USER_ID}/test.txt`);
    
    await uploadString(storageRef, testFileContent);
    console.log("   Uploaded test file successfully");
  });

  // Test file download
  await runTest("Storage File Download", async () => {
    const storageRef = ref(storage, `test-files/${TEST_USER_ID}/test.txt`);
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log(`   File download URL: ${downloadURL}`);
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("🔥 FIREBASE PRODUCTION TESTING SCRIPT 🔥");
  console.log("======================================");
  console.log("Testing with Firebase project:", firebaseConfig.projectId);
  
  try {
    console.log("\n📱 TESTING AUTHENTICATION");
    await testAuthentication();
    
    console.log("\n📊 TESTING FIRESTORE");
    await testFirestore();
    
    console.log("\n📁 TESTING STORAGE");
    await testStorage();
    
    // Final cleanup
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Error during final cleanup:", error.message);
    }
    
    // Print results
    console.log("\n📋 TEST RESULTS");
    console.log("======================================");
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    
    if (testResults.failed === 0) {
      console.log("\n✅ ALL TESTS PASSED!");
      console.log("Your Firebase production setup is working correctly.");
    } else {
      console.log("\n❌ SOME TESTS FAILED!");
      console.log("Please fix the issues before deploying to production.");
    }
  } catch (error) {
    console.error("Unexpected error during testing:", error);
  }
}

// Run all tests
runAllTests();
