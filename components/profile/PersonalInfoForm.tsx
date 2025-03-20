import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { useUser } from '../../context/UserContext';
import { AuthInput } from '../auth/AuthInput';
import { X } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';

interface PersonalInfoFormProps {
  isModal?: boolean;
  onClose?: () => void;
}

export default function PersonalInfoForm({ isModal = false, onClose }: PersonalInfoFormProps) {
  const { userProfile, updateProfile } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setMobile(userProfile.mobile || '');
      setCountry(userProfile.country || '');
    }
    
    // Animate the form appearance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [userProfile, fadeAnim]);

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

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await updateProfile({
        firstName,
        lastName,
        mobile,
        country,
        displayName: `${firstName} ${lastName}`
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (isModal && onClose) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Personal Information</Text>
            {isModal && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formContainer}>
            {error && (
              <Animated.View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}
            
            {success && (
              <Animated.View style={styles.successContainer}>
                <Text style={styles.successText}>Profile updated successfully!</Text>
              </Animated.View>
            )}
            
            <AuthInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              autoCapitalize="words"
              error=""
              required
            />
            
            <AuthInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              autoCapitalize="words"
              error=""
              required
            />
            
            <AuthInput
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              placeholder="Enter your mobile number"
              keyboardType="phone-pad"
              error=""
            />
            
            <AuthInput
              label="Country"
              value={country}
              onChangeText={setCountry}
              placeholder="Enter your country"
              autoCapitalize="words"
              error=""
            />
            
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  formContainer: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: Colors.error + '15', 
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error + '30', 
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: Colors.success + '15', 
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.success + '30', 
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#ffa000', 
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
