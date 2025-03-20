import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/initAuth';
import { Alert } from 'react-native';

export type UserProfile = {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  mobile?: string;
  country?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt: string;
  photoURL?: string;
  role?: 'user' | 'admin';
};

type UserContextType = {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isTestingPremium: boolean;
  register: (email: string, password: string, userData?: Partial<UserProfile>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  toggleTestPremium: () => void;
  updateSubscriptionStatus: (isPremium: boolean) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  isOffline: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestingPremium, setIsTestingPremium] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Check if we're offline and load cached user data if available
  const loadCachedUserData = async () => {
    try {
      const cachedUserString = await AsyncStorage.getItem('cached_user_profile');
      if (cachedUserString) {
        const cachedUser = JSON.parse(cachedUserString);
        setUserProfile(cachedUser);
        setIsOffline(true);
        console.log('Loaded cached user profile');
      }
    } catch (error) {
      console.error('Error loading cached user data:', error);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Set up real-time listener for user profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const unsubscribeSnapshot = onSnapshot(userDocRef, (doc: DocumentSnapshot) => {
            if (doc.exists()) {
              const profile = doc.data() as UserProfile;
              setUserProfile(profile);
              
              // Cache the profile for offline use
              AsyncStorage.setItem('cached_user_profile', JSON.stringify(profile))
                .catch(err => console.error('Error caching user profile:', err));
              
              setIsOffline(false);
            } else {
              // Create a default profile if none exists
              const defaultProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                country: '',
                isPremium: false,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                role: 'user'
              };
              
              setDoc(userDocRef, defaultProfile)
                .then(() => {
                  setUserProfile(defaultProfile);
                  return AsyncStorage.setItem('cached_user_profile', JSON.stringify(defaultProfile));
                })
                .then(() => setIsOffline(false))
                .catch(err => console.error('Error creating default profile:', err));
            }
          }, (error: Error) => {
            console.error('Error in user profile snapshot:', error);
            loadCachedUserData();
          });
          
          // Clean up the snapshot listener when auth state changes
          return () => unsubscribeSnapshot();
        } catch (error) {
          console.error('Error setting up user profile listener:', error);
          // If we can't fetch the profile, try to load from cache
          await loadCachedUserData();
        } finally {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const register = async (email: string, password: string, userData?: Partial<UserProfile>) => {
    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user: newUser } = userCredential;
      
      // Create user profile
      const userProfile: UserProfile = {
        uid: newUser.uid,
        email: email,
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        mobile: userData?.mobile || '',
        country: userData?.country || '',
        displayName: userData?.firstName && userData?.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : '',
        isPremium: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        role: 'user'
      };
      
      await setDoc(doc(db, 'users', newUser.uid), userProfile);
      await AsyncStorage.setItem('cached_user_profile', JSON.stringify(userProfile));
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      
      setError(errorMessage);
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          lastLoginAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      setError(errorMessage);
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('cached_user_profile');
      setIsTestingPremium(false);
    } catch (error: any) {
      setError('Logout failed. Please try again.');
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('No authenticated user found');
    }

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Add timestamp for the update
      const updatedData = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(userDocRef, updatedData);
      
      // The profile will be updated automatically through the onSnapshot listener
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleTestPremium = () => {
    setIsTestingPremium(prev => !prev);
  };

  const updateSubscriptionStatus = async (isPremium: boolean) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { isPremium });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, isPremium } : null);
      
      // Update cached data
      const cachedUserString = await AsyncStorage.getItem('cached_user_profile');
      if (cachedUserString) {
        const cachedUser = JSON.parse(cachedUserString);
        await AsyncStorage.setItem('cached_user_profile', JSON.stringify({ ...cachedUser, isPremium }));
      }
    } catch (error: any) {
      setError('Failed to update subscription. Please try again.');
      Alert.alert('Subscription Error', 'Failed to update subscription status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
        } else {
          // Create a default profile if none exists
          const defaultProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            country: '',
            isPremium: false,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            role: 'user'
          };
          
          await setDoc(userDocRef, defaultProfile);
          setUserProfile(defaultProfile);
          await AsyncStorage.setItem('cached_user_profile', JSON.stringify(defaultProfile));
          setIsOffline(false);
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  };

  // Create default user profile for offline demo if needed
  useEffect(() => {
    if (!user && !userProfile && isOffline) {
      const createDefaultUserProfile = async () => {
        const defaultProfile: UserProfile = {
          uid: 'offline-user',
          email: 'demo@safehmo.co.uk',
          country: '',
          isPremium: false,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        
        setUserProfile(defaultProfile);
        await AsyncStorage.setItem('cached_user_profile', JSON.stringify(defaultProfile));
        console.log('Created default user profile due to offline/error');
      };
      
      createDefaultUserProfile();
    }
  }, [user, userProfile, isOffline]);

  const value = {
    user,
    userProfile,
    loading,
    error,
    isTestingPremium,
    register,
    login,
    logout,
    updateProfile,
    toggleTestPremium,
    updateSubscriptionStatus,
    refreshUserProfile,
    isOffline,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
