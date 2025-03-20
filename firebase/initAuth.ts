import { auth, db } from './config';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Initialize Firebase Auth with AsyncStorage for persistence
 */
export const initializeAuthState = () => {
  if (Platform.OS !== 'web') {
    // Set up a listener to persist auth state in AsyncStorage
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is signed in
          await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
          // User is signed out
          await AsyncStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error persisting auth state:', error);
      }
    });
  }
};

/**
 * Get the current user from AsyncStorage
 */
export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export { auth, db };
