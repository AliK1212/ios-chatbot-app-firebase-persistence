import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, Auth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../../context/UserContext';
import CountryPicker from 'react-native-country-picker-modal';
import { Country } from 'react-native-country-picker-modal';
import { Colors } from '../../constants/Colors';

// Create a typed reference to auth
const authInstance: Auth = auth;

// List of countries for dropdown
const countries = [
  "United Kingdom", "United States", "Canada", "Australia", 
  "Germany", "France", "Spain", "Italy", "Netherlands", 
  "Belgium", "Portugal", "Sweden", "Norway", "Denmark", 
  "Finland", "Ireland", "New Zealand", "South Africa", 
  "Nigeria", "Ghana", "Kenya", "India", "Pakistan", 
  "Bangladesh", "China", "Japan", "South Korea", "Singapore", 
  "Malaysia", "Indonesia", "Philippines", "Brazil", "Mexico", 
  "Argentina", "Chile", "Colombia", "Peru", "Other"
];

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  
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

  const { register } = useUser();

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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string) => {
    // Allow empty mobile number
    if (!mobile) return true;
    
    // Basic international phone number validation
    const mobileRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3,4}[-\s.]?[0-9]{3,9}$/;
    return mobileRegex.test(mobile);
  };

  const validateName = (name: string) => {
    return name.length >= 2 && /^[a-zA-Z\s'-]+$/.test(name);
  };

  const handleRegister = async () => {
    // Reset error
    setError('');
    
    // Validate all inputs
    if (!firstName || !lastName || !email || !password || !confirmPassword || !country) {
      setError('All fields except mobile number are required');
      return;
    }

    // Validate names
    if (!validateName(firstName)) {
      setError('Please enter a valid first name (at least 2 characters, letters only)');
      return;
    }

    if (!validateName(lastName)) {
      setError('Please enter a valid last name (at least 2 characters, letters only)');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate mobile if provided
    if (mobile && !validateMobile(mobile)) {
      setError('Please enter a valid mobile number');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      // Use the register function from UserContext
      await register(email, password, {
        firstName,
        lastName,
        mobile: mobile || undefined,
        country: country,
        displayName: `${firstName} ${lastName}`
      });
      
      // Navigation will happen automatically through the UserContext
    } catch (error: any) {
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already in use');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create account. Please try again.');
        console.error('Registration error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectCountry = (selectedCountry: string) => {
    setCountry(selectedCountry);
    setShowCountryModal(false);
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
                colors={[Colors.brandWithOpacity(0.3), Colors.brandWithOpacity(0.1)]}
                style={styles.logoBackground}
              >
                <Image 
                  source={require('../../assets/images/safe-logo-.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
            </Animated.View>

            <Animated.View 
              style={[
                styles.formContainer, 
                fadeStyle,
                slideStyle,
                { 
                  width: isTablet ? '80%' : '100%',
                  alignSelf: 'center'
                }
              ]}
            >
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Sign up to get started</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              
              <View style={styles.form}>
                <AuthInput
                  label="First Name"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  required
                />
                
                <AuthInput
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  required
                />
                
                <AuthInput
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  required
                />
                
                <AuthInput
                  label="Mobile"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                />
                
                <TouchableOpacity 
                  style={styles.countrySelector}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={styles.countryLabel}>Country <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.countryInputContainer}>
                    <Text style={country ? styles.countryText : styles.countryPlaceholder}>
                      {country || "Select your country"}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <AuthInput
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  required
                />
                
                <AuthInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  required
                />
                
                <TouchableOpacity 
                  style={styles.registerButton} 
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
                
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account? </Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity>
                      <Text style={styles.loginLink}>Sign In</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity 
                onPress={() => setShowCountryModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={countries}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => selectCountry(item)}
                >
                  <Text style={styles.countryItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    color: Colors.secondary,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  errorText: {
    color: '#FF9800',
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    height: 50,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#666',
  },
  loginLink: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  countrySelector: {
    marginBottom: 15,
  },
  countryLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
    fontWeight: '500',
  },
  requiredStar: {
    color: '#FF9800',
  },
  countryInputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  countryText: {
    color: '#666',
  },
  countryPlaceholder: {
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  countryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  countryItemText: {
    fontSize: 16,
    color: '#666',
  },
});