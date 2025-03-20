import React, { createContext, useContext } from 'react';
import { useUser } from './UserContext';
import { User as FirebaseUser } from 'firebase/auth';

// Define the AuthContext type
type AuthContextType = {
  user: FirebaseUser | null;
  isAdmin: boolean;
  isPremium: boolean;
};

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps the app and provides the auth context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the existing UserContext
  const { user, userProfile } = useUser();

  // Determine admin and premium status from userProfile
  const isAdmin = userProfile?.isAdmin || false;
  const isPremium = userProfile?.isPremium || false;

  // The value that will be provided to consumers of this context
  const value = {
    user,
    isAdmin,
    isPremium,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
