// IMPORTANT: Replace these demo values with your production Firebase credentials
// You'll get these values from the Firebase Console after creating your project
// Visit: https://console.firebase.google.com/
// 
// PRODUCTION SETUP:
// 1. Create a .env file in the project root (if not already created)
// 2. Add the following variables with your Firebase project values:
//    FIREBASE_API_KEY=your_api_key
//    FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
//    FIREBASE_PROJECT_ID=your_project_id
//    FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
//    FIREBASE_MESSAGING_SENDER_ID=your_sender_id
//    FIREBASE_APP_ID=your_app_id
//    FIREBASE_MEASUREMENT_ID=your_measurement_id
//    OPENAI_API_KEY=your_openai_api_key

export const firebaseConfig = {
  apiKey: "AIzaSyCu1mQJesDxW3mMQvNWralKK69K362lPLk",
  authDomain: "safe-hmo-demo.firebaseapp.com",
  projectId: "safe-hmo-demo",
  storageBucket: "safe-hmo-demo.firebasestorage.app",
  messagingSenderId: "462410251940",
  appId: "1:462410251940:web:b9af66433f77532641b031",
  measurementId: "G-SWN5GQDTS1"
};

// Firebase Collection Names - You can customize these if needed
export const COLLECTIONS = {
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
  PDF_DOCUMENTS: 'pdf_documents',
  PDF_CHUNKS: 'pdf_chunks',
  TOKEN_USAGE: 'token_usage',
  CONSULTATIONS: 'consultations',
  DOCUMENTS: 'documents',  // Added for new document storage
  CHUNKS: 'chunks',         // Added for new chunk storage
  CHAT_MESSAGES: 'chat_messages'
};

// Storage Paths - You can customize these if needed
export const STORAGE_PATHS = {
  USER_DOCUMENTS: 'user_documents',
  PROFILE_PICTURES: 'profile_pictures',
  PDF_DOCUMENTS: 'pdf_documents', // This should match the prefix used in ProcessPdfsModal
  PDFS: 'pdf_documents/'          // Include trailing slash for direct use in storage references
};

// Vector search configuration
export const VECTOR_CONFIG = {
  DIMENSIONS: 768, // Dimension for embeddings
  DISTANCE_MEASURE: 'COSINE', // COSINE or EUCLIDEAN
  INDEX_NAME: 'pdf-content-index'
};

// OpenAI configuration
export const OPENAI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
  MAX_OUTPUT_TOKENS: 1000,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  // IMPORTANT: You must set a valid OpenAI API key to use the embedding and chat functionality
  // Get your API key from https://platform.openai.com/api-keys
  // For Expo projects, this key needs to be hardcoded here or set in app.config.js
  API_KEY: "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",
};

// Authentication persistence key
export const AUTH_PERSISTENCE_KEY = '@SafeHMO:authUser';

// Firestore Security Rules Reference
/*
// Copy these rules to your Firebase Console > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - users can only read/write their own data
    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Chat sessions - users can only access their own chat sessions
    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == resource.data.userId;
    }
    
    // Messages - users can only access messages from their sessions
    match /messages/{messageId} {
      allow read, write: if request.auth != null && 
                           exists(/databases/$(database)/documents/chatSessions/$(resource.data.sessionId)) &&
                           get(/databases/$(database)/documents/chatSessions/$(resource.data.sessionId)).data.userId == request.auth.uid;
    }
    
    // Documents - users can only access their own documents
    match /userDocuments/{docId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
  }
}
*/

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally (only in web environment)
let analytics = null;
try {
  if (Platform.OS === 'web') {
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      }
    });
  }
} catch (error) {
  console.warn('Firebase Analytics not supported in this environment:', error);
}

// Initialize Firestore with proper settings
const db = Platform.OS === 'web' 
  ? getFirestore(app)
  : initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });

// Initialize Auth
const auth = getAuth(app);

// Set persistence for web
if (Platform.OS === 'web') {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error('Error setting persistence:', error);
    });
}

// Enable offline persistence for web
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('Firestore offline persistence enabled');
    })
    .catch((error) => {
      console.error('Error enabling offline persistence:', error);
      if (error.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (error.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence.');
      }
    });
}

// Initialize Firebase Storage
const storage = getStorage(app);

// Log Firebase initialization
console.log('Firebase initialized with project:', firebaseConfig.projectId);
console.log('Firebase Storage bucket:', firebaseConfig.storageBucket);

export { auth, db, storage };
