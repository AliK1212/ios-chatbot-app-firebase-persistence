import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { useNetwork } from '../../context/NetworkContext';
import { WifiOff, Check, Calendar, Phone, Mail, Home, FileText } from 'lucide-react-native';
import { COLLECTIONS } from '../../firebase/config';

export default function ConsultationScreen() {
  const { user, userProfile } = useUser();
  const { isConnected } = useNetwork();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.displayName || '',
    email: userProfile?.email || '',
    mobile: userProfile?.mobile || '',
    address: '',
    propertyType: '',
    message: '',
    preferredDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9+\s()-]{10,15}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number is invalid';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Please describe your consultation needs';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please connect to the internet to submit your consultation request.'
      );
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const db = getFirestore();
      const consultationsRef = collection(db, COLLECTIONS.CONSULTATIONS || 'consultations');
      
      await addDoc(consultationsRef, {
        userId: user?.uid || 'anonymous',
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        propertyType: formData.propertyType,
        message: formData.message,
        preferredDate: formData.preferredDate,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      Alert.alert(
        'Consultation Request Submitted',
        'Thank you for your request. Our team will contact you shortly to schedule your consultation.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Reset form after successful submission
              setFormData({
                name: userProfile?.displayName || '',
                email: userProfile?.email || '',
                mobile: userProfile?.mobile || '',
                address: '',
                propertyType: '',
                message: '',
                preferredDate: '',
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting consultation request:', error);
      Alert.alert(
        'Error',
        'There was an error submitting your request. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Request a Consultation</Text>
            <Text style={styles.headerSubtitle}>
              Fill out the form below and our HMO experts will contact you
            </Text>
            
            {!isConnected && (
              <View style={styles.offlineIndicator}>
                <WifiOff size={16} color="#FFA026" />
                <Text style={styles.offlineText}>Offline - Cannot submit form</Text>
              </View>
            )}
          </View>
          
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Full Name</Text>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>
              <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => handleChange('name', value)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Email Address</Text>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Mail size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleChange('email', value)}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            
            {/* Mobile Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Mobile Number</Text>
                {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
              </View>
              <View style={[styles.inputContainer, errors.mobile && styles.inputError]}>
                <Phone size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.mobile}
                  onChangeText={(value) => handleChange('mobile', value)}
                  placeholder="Enter your mobile number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            {/* Address Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Property Address (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <Home size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(value) => handleChange('address', value)}
                  placeholder="Enter property address"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            {/* Property Type Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Property Type (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <FileText size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.propertyType}
                  onChangeText={(value) => handleChange('propertyType', value)}
                  placeholder="e.g. House, Flat, Commercial"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            {/* Preferred Date Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Preferred Date (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <Calendar size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.preferredDate}
                  onChangeText={(value) => handleChange('preferredDate', value)}
                  placeholder="e.g. Next week, Specific date"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            {/* Message Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Text style={styles.labelText}>Consultation Details</Text>
                {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
              </View>
              <View style={[styles.textareaContainer, errors.message && styles.inputError]}>
                <TextInput
                  style={styles.textarea}
                  value={formData.message}
                  onChangeText={(value) => handleChange('message', value)}
                  placeholder="Please describe what you need help with..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>
            
            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!isConnected || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isConnected || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.disclaimer}>
              By submitting this form, you agree to be contacted by our team regarding your HMO consultation request.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  errorText: {
    fontSize: 12,
    color: '#e53935',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#e53935',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#333',
  },
  textareaContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
  },
  textarea: {
    height: 120,
    fontSize: 15,
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA026',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});
