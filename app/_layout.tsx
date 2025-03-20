import React, { useEffect } from 'react';
import { Stack, Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider, useUser } from '../context/UserContext';
import { NetworkProvider } from '../context/NetworkContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initializeAuthState } from '../firebase/initAuth';
import { NetworkStatusBar } from '../components/ui/NetworkStatusBar';

// Initialize Firebase Auth with AsyncStorage persistence
initializeAuthState();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Auth guard component to handle protected routes
function AuthGuard() {
  const { user, loading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [user, segments, loading]);

  useEffect(() => {
    // Hide splash screen once auth state is determined
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Show a loading screen while determining auth state
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#FFFFFF' 
      }}>
        <Image 
          source={require('../assets/images/safe-logo-.png')} 
          style={{ width: 100, height: 100, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold',
          color: '#FF9800',
          marginBottom: 10
        }}>
          Safe HMO
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: '#666',
          marginBottom: 20
        }}>
          Property Management Made Easy
        </Text>
        <ActivityIndicator size="large" color="#FFA026" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NetworkProvider>
          <UserProvider>
            <AuthGuard />
            <NetworkStatusBar />
          </UserProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}