import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { LinearGradient } from 'expo-linear-gradient';

const authInstance: Auth = auth;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create animated values using Reanimated 2
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  
  // Get dimensions using Dimensions API
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  
  // Calculate responsive sizes
  const isTablet = windowWidth > 768;
  const containerWidth = isTablet ? '60%' : '100%';
  const logoSize = isTablet ? 200 : 300;

  // Define animated styles
  const fadeStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value
    };
  });

  const slideStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: slideAnim.value }]
    };
  });

  useEffect(() => {
    // Start animations when component mounts
    fadeAnim.value = withTiming(1, { duration: 1000 });
    slideAnim.value = withTiming(0, { duration: 800 });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signInWithEmailAndPassword(authInstance, email, password);
      // Navigation will happen automatically through the UserContext
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else {
        setError('Failed to sign in. Please try again.');
        console.error('Login error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#FFF8E1', '#FFFFFF']}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            minHeight: windowHeight,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, { width: containerWidth }]}>
            <Animated.View 
              style={[
                styles.logoSection, 
                fadeStyle, 
                slideStyle
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 160, 0, 0.3)', 'rgba(255, 160, 0, 0.1)']}
                style={styles.logoBackground}
              >
                <Image 
                  source={require('../../assets/images/safe-logo-.png')} 
                  style={[styles.logo, { width: logoSize, height: logoSize }]}
                  resizeMode="contain"
                />
              </LinearGradient>
            </Animated.View>

            <Animated.View 
              style={[
                styles.formContainer, 
                fadeStyle, 
                slideStyle,
                { width: isTablet ? '80%' : '100%', alignSelf: 'center' }
              ]}
            >
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to your account</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              
              <View style={styles.form}>
                <AuthInput
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <AuthInput
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
                
                <AuthButton 
                  title="Sign In" 
                  onPress={handleLogin}
                  variant="primary"
                  loading={loading}
                  style={styles.loginButton}
                />
                
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <Link href="/(auth)/register" asChild>
                    <TouchableOpacity>
                      <Text style={styles.signupLink}>Sign Up</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    maxWidth: Platform.OS === 'web' ? '90%' : 500,
    alignSelf: 'center',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: -60,
  },
  logoBackground: {
    width: '120%',
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 20,
    paddingHorizontal: 0,
    marginLeft: -40,
    marginRight: -40,
    marginTop: -20,
  },
  logo: {
    width: 300,
    height: 300,
    marginVertical: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFA026',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  form: {
    gap: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 6,
  },
  forgotPasswordText: {
    color: '#FFA026',
    fontSize: 13,
  },
  loginButton: {
    marginTop: 12,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#FFA026',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
  },
});