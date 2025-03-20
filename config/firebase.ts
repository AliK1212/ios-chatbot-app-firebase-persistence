import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

// Firebase configuration
// In a real app, these values would be stored in environment variables
const firebaseConfig = {
  apiKey: "AIzaSyDpiMhgCCOQv0zoAPiacuWJWKvZnm7xa7E",
  authDomain: "safehmo-demo.firebaseapp.com",
  projectId: "safe-hmo-demo",
  storageBucket: "safehmo-demo.firebasestorage.app",
  messagingSenderId: "109308632097",
  appId: "1:109308632097:web:fa7d4ec0e067f92bc19760",
  measurementId: "G-TKV9NMW29E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
