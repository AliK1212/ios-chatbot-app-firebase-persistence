import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Switch, ScrollView, Alert, Modal } from 'react-native';
import { User, Settings, CreditCard, LogOut, ChevronRight, Bell, Shield, HelpCircle, Star, FileText, MessageSquare } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/initAuth';
import ProcessPdfsModal from '../../components/ui/ProcessPdfsModal';
import PersonalInfoForm from '../../components/profile/PersonalInfoForm';
import { Colors } from '../../constants/Colors';
import { getUserTokenUsage } from '../../firebase/pdfService';

// Token limit for free users
const FREE_TOKEN_LIMIT = 50000;

export default function ProfileScreen() {
  const { userProfile, refreshUserProfile, user } = useUser();
  const [isPremium, setIsPremium] = useState(userProfile?.isPremium);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [processPdfsModalVisible, setProcessPdfsModalVisible] = useState(false);
  const [personalInfoModalVisible, setPersonalInfoModalVisible] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [tokenLimitReached, setTokenLimitReached] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setIsPremium(userProfile.isPremium);
    }
  }, [userProfile]);

  // Load user's token usage
  useEffect(() => {
    const loadTokenUsage = async () => {
      if (user) {
        try {
          const usage = await getUserTokenUsage(user.uid);
          setTokenUsage(usage);
          
          // Check if token limit is reached for non-premium users
          if (!userProfile?.isPremium && usage >= FREE_TOKEN_LIMIT) {
            setTokenLimitReached(true);
          } else {
            setTokenLimitReached(false);
          }
        } catch (error) {
          console.error('Error loading token usage:', error);
        }
      }
    };
    
    loadTokenUsage();
  }, [user, userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigate to login screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleUpgradePress = () => {
    if (isPremium) {
      Alert.alert(
        'Manage Subscription',
        'You are currently on the Premium plan (£15.99/month). Would you like to manage your subscription?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Manage',
            onPress: () => {
              Alert.alert('Coming Soon', 'Subscription management will be available in a future update.');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Upgrade to Premium',
        'Upgrade to our Premium plan for £15.99/month to access exclusive content and features.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
          },
          {
            text: 'Upgrade',
            onPress: () => {
              Alert.alert('Coming Soon', 'Payment processing will be available in a future update.');
            },
          },
        ]
      );
    }
  };

  const handleRequestConsultation = () => {
    router.push('/consultation');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={userProfile?.photoURL ? { uri: userProfile.photoURL } : require('../../assets/images/default-avatar.png')}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile?.displayName || 'User'}</Text>
            <Text style={styles.profileEmail}>{userProfile?.email || ''}</Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>Premium Member</Text>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity style={styles.membershipCard} onPress={handleUpgradePress}>
          <View style={styles.membershipContent}>
            <Text style={styles.membershipTitle}>
              {isPremium ? 'Premium Membership' : 'Free Membership'}
            </Text>
            <Text style={styles.membershipDescription}>
              {isPremium
                ? 'You have access to all premium features and content.'
                : 'Upgrade to premium for exclusive content and features.'}
            </Text>
          </View>
          <View style={[styles.upgradeButton, isPremium && styles.managePlanButton]}>
            <Text style={styles.upgradeButtonText}>
              {isPremium ? 'Manage' : 'Upgrade'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setPersonalInfoModalVisible(true)}
        >
          <View style={styles.settingIcon}>
            <User size={20} color="#454545" />
          </View>
          <Text style={styles.settingText}>Personal Information</Text>
          <ChevronRight size={20} color="#ccc" />
        </TouchableOpacity>
        
        {/* Token Usage Section */}
        <View style={styles.tokenUsageContainer}>
          <View style={styles.tokenUsageHeader}>
            <View style={styles.settingIcon}>
              <MessageSquare size={20} color="#454545" />
            </View>
            <Text style={styles.settingText}>Token Usage</Text>
          </View>
          
          <View style={styles.tokenUsageDetails}>
            <View style={styles.tokenUsageBarContainer}>
              <View 
                style={[
                  styles.tokenUsageBar, 
                  { 
                    width: `${Math.min(100, (tokenUsage / FREE_TOKEN_LIMIT) * 100)}%`,
                    backgroundColor: tokenLimitReached ? '#FF6B6B' : '#4CAF50'
                  }
                ]} 
              />
            </View>
            <Text style={styles.tokenUsageText}>
              {tokenUsage.toLocaleString()} / {FREE_TOKEN_LIMIT.toLocaleString()} tokens used
              {isPremium ? ' (Unlimited with Premium)' : ''}
            </Text>
            
            {tokenLimitReached && !isPremium && (
              <View style={styles.tokenLimitReachedContainer}>
                <Text style={styles.tokenLimitReachedText}>
                  You have reached your free allocation limit.
                </Text>
                <TouchableOpacity 
                  style={styles.consultationButton}
                  onPress={handleRequestConsultation}
                >
                  <Text style={styles.consultationButtonText}>Request Free Consultation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Settings size={20} color="#454545" />
          </View>
          <Text style={styles.settingText}>Preferences</Text>
          <ChevronRight size={20} color="#ccc" />
        </TouchableOpacity>
        
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color="#454545" />
          </View>
          <Text style={styles.settingText}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#e0e0e0', true: '#ffd599' }}
            thumbColor={notificationsEnabled ? '#FF9800' : '#f4f3f4'}
          />
        </View>
        
        {isPremium && (
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <CreditCard size={20} color="#454545" />
            </View>
            <Text style={styles.settingText}>Payment Methods</Text>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>
        )}
        
        {userProfile?.role === 'admin' && (
          <>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                router.push({
                  pathname: "/admin/token-usage" as any
                });
              }}
            >
              <View style={styles.settingIcon}>
                <Star size={20} color="#454545" />
              </View>
              <Text style={styles.settingText}>Admin Dashboard</Text>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                setProcessPdfsModalVisible(true);
              }}
            >
              <View style={styles.settingIcon}>
                <FileText size={20} color="#454545" />
              </View>
              <Text style={styles.settingText}>Process PDF Documents</Text>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <HelpCircle size={20} color="#454545" />
          </View>
          <Text style={styles.settingText}>Help Center</Text>
          <ChevronRight size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/privacy-policy')}
        >
          <View style={styles.settingIcon}>
            <Shield size={20} color="#ffa000" />
          </View>
          <Text style={styles.settingText}>Privacy Policy</Text>
          <ChevronRight size={20} color="#ffa000" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <ProcessPdfsModal 
        isVisible={processPdfsModalVisible}
        onClose={() => setProcessPdfsModalVisible(false)}
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={personalInfoModalVisible}
        onRequestClose={() => setPersonalInfoModalVisible(false)}
      >
        <PersonalInfoForm 
          isModal={true}
          onClose={() => {
            setPersonalInfoModalVisible(false);
            refreshUserProfile();
          }}
        />
      </Modal>

      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Safe HMO App v1.0.0</Text>
        <Text style={styles.versionText}> 2025 Safe HMO Group</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  premiumBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  premiumText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  membershipCard: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  membershipContent: {
    flex: 1,
  },
  membershipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  membershipDescription: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#ffa026',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  managePlanButton: {
    backgroundColor: '#fff',
  },
  upgradeButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4444',
    marginLeft: 8,
  },
  versionInfo: {
    alignItems: 'center',
    marginVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  tokenUsageContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tokenUsageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenUsageDetails: {
    paddingVertical: 12,
  },
  tokenUsageBarContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  tokenUsageBar: {
    height: 10,
    borderRadius: 5,
  },
  tokenUsageText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tokenLimitReachedContainer: {
    paddingVertical: 12,
  },
  tokenLimitReachedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  consultationButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  consultationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
