import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar, 
  Animated,
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, ChevronRight, Star, Lock } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
import { Chatbot } from '../../components/ui/Chatbot';

const reviews = [
  {
    name: "Li",
    text: "We used the build team for our buy-to-let projects. The team is reliable and knowledgeable. The works are good quality and time-effective. Their price is reasonable..."
  },
  {
    name: "Daryl H",
    text: "Dal was a pleasure to deal with, very professional and informative. I would definitely use again."
  },
  {
    name: "Anonymous",
    text: "Great to work with Dal and the team. I've done a few projects now with SafeHMO and they always delivery high quality construction and property development."
  },
  {
    name: "Caroline",
    text: "I have been utilising SafeHmo services for some time now and have always found Dal knowledgable with regards to all the safety aspects and legislation..."
  },
  {
    name: "ke f",
    text: "Very useful advise for HMO application. Thanks very much."
  },
  {
    name: "JKay",
    text: "Safehmo has provided valuable advice to a couple of my proposals - it has demonstrated high level of customer service, technical competencies, resourceful..."
  },
  {
    name: "Gerry C",
    text: "Dail and colleagues were extremely helpful in guiding me through the process.I would highly recommend Safe HMO to any landlord."
  },
  {
    name: "Veronica",
    text: "Safe HMO helped us to go through the complicate process of HMO application with their professional guidance and support. Great service!"
  },
  {
    name: "Andy H",
    text: "Everything was made understandable Thank you."
  }
];

const premiumFeatures = [
  {
    title: "Advanced Document Analysis",
    description: "Coming soon - AI-powered insights from your HMO documents"
  },
  {
    title: "Multi-Property Management",
    description: "Coming soon - Manage multiple HMOs in one place"
  },
  {
    title: "Compliance Automation",
    description: "Coming soon - Automated compliance checks and reminders"
  }
];

function HomeScreen() {
  const [loading, setLoading] = React.useState(true);
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const router = useRouter();
  const { userProfile } = useUser();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleChatPress = () => {
    router.navigate('/(tabs)/chat');
  };

  const handleNewsPress = () => {
    Linking.openURL('https://safehmo.co.uk/safe-hmo-blog/');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA026" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={['rgba(255, 160, 0, 0.3)', 'rgba(255, 160, 0, 0.1)']}
            style={styles.logoBackground}
          >
            <Image 
              source={require('../../assets/images/safe-logo-.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>

        {/* SafeHMO Assistant Section */}
        <View style={styles.assistantSection}>
          <Text style={styles.sectionTitle}>SafeHMO Assistant</Text>
          <Chatbot isCompact={true} />
          <TouchableOpacity style={styles.fullChatButton} onPress={handleChatPress}>
            <Text style={styles.fullChatButtonText}>Go to chat page</Text>
            <ChevronRight size={16} color="#ff9000" />
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Our Clients Say</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.reviewsScroll}
          >
            {reviews.map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.name}</Text>
                  <View style={styles.starsContainer}>
                    {[1,2,3,4,5].map((_, i) => (
                      <Star key={i} size={14} color="#FFA026" style={styles.starIcon} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Latest HMO News Section */}
        <TouchableOpacity style={styles.newsSection} onPress={handleNewsPress}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest from Safe HMO</Text>
            <ChevronRight size={20} color="#666" />
          </View>
          <Text style={styles.newsDescription}>
            Stay updated with the latest HMO regulations, industry news, and expert advice on our blog
          </Text>
        </TouchableOpacity>

        {/* Premium Features (Coming Soon) */}
        <View style={styles.premiumSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
          <View style={styles.premiumFeatures}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.premiumFeatureCard}>
                <Lock size={20} color="#666" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.premiumFeatureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f0e8',
  },
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: -90,
  },
  logoBackground: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: -20,
    paddingTop: 0,
    marginTop: -50,
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
  assistantSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fullChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  fullChatButtonText: {
    color: '#ff9000',
    fontSize: 14,
    marginRight: 4,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reviewsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  reviewCard: {
    backgroundColor: '#00B67A',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  reviewText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  newsSection: {
    padding: 16,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  premiumSection: {
    padding: 16,
    marginHorizontal: 16,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#FFA026',
    fontWeight: 'bold',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  premiumFeatures: {
    gap: 12,
  },
  premiumFeatureCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumFeatureContent: {
    flex: 1,
  },
  premiumFeatureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  premiumFeatureDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});