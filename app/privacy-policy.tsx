import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#ffa000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: March 18, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          SafeHMO ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our SafeHMO mobile application and related services (collectively, the "Service").
        </Text>
        <Text style={styles.paragraph}>
          Please read this Privacy Policy carefully. By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subSectionTitle}>2.1 Personal Information</Text>
        <Text style={styles.paragraph}>
          We may collect personal information that you voluntarily provide to us when you register for the Service, express interest in obtaining information about us or our products, or otherwise contact us. This information may include:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Name</Text>
          <Text style={styles.bulletItem}>• Email address</Text>
          <Text style={styles.bulletItem}>• Phone number</Text>
          <Text style={styles.bulletItem}>• Address information</Text>
          <Text style={styles.bulletItem}>• Account login credentials</Text>
        </View>

        <Text style={styles.subSectionTitle}>2.2 Chat and Document Data</Text>
        <Text style={styles.paragraph}>
          When you use our chatbot or consultation services, we collect and store the content of your conversations, inquiries, and uploaded PDF documents to provide you with relevant responses and improve our services.
        </Text>

        <Text style={styles.subSectionTitle}>2.3 Mobile Device Information</Text>
        <Text style={styles.paragraph}>
          We automatically collect certain information about your mobile device, including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Device type and model</Text>
          <Text style={styles.bulletItem}>• Operating system version</Text>
          <Text style={styles.bulletItem}>• Unique device identifiers</Text>
          <Text style={styles.bulletItem}>• Mobile network information</Text>
          <Text style={styles.bulletItem}>• IP address</Text>
          <Text style={styles.bulletItem}>• Usage patterns and preferences</Text>
        </View>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect for various purposes, including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Providing, maintaining, and improving our Service</Text>
          <Text style={styles.bulletItem}>• Processing and completing transactions</Text>
          <Text style={styles.bulletItem}>• Responding to your inquiries and support requests</Text>
          <Text style={styles.bulletItem}>• Sending administrative information, updates, and security alerts</Text>
          <Text style={styles.bulletItem}>• Personalizing your experience</Text>
          <Text style={styles.bulletItem}>• Analyzing usage patterns to improve functionality</Text>
          <Text style={styles.bulletItem}>• Preventing fraudulent activities and enforcing our terms</Text>
        </View>

        <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
        <Text style={styles.paragraph}>
          We may share your information in the following situations:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• With service providers who perform services on our behalf</Text>
          <Text style={styles.bulletItem}>• To comply with legal obligations</Text>
          <Text style={styles.bulletItem}>• To protect and defend our rights and property</Text>
          <Text style={styles.bulletItem}>• With your consent or at your direction</Text>
        </View>
        <Text style={styles.paragraph}>
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have certain rights regarding your personal information, including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Accessing, correcting, or deleting your personal information</Text>
          <Text style={styles.bulletItem}>• Withdrawing consent where processing is based on consent</Text>
          <Text style={styles.bulletItem}>• Requesting restriction of processing</Text>
          <Text style={styles.bulletItem}>• Data portability</Text>
          <Text style={styles.bulletItem}>• Objecting to processing</Text>
        </View>
        <Text style={styles.paragraph}>
          To exercise these rights, please contact us using the information provided in the "Contact Us" section.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our Service is not directed to children under the age of 16. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>8. AI Processing and OpenAI Integration</Text>
        <Text style={styles.paragraph}>
          Our app uses OpenAI's API services to process text and generate responses for our PDF chatbot feature. When you use this feature:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Your document content and chat messages are sent to OpenAI for processing</Text>
          <Text style={styles.bulletItem}>• OpenAI processes this data in accordance with their privacy policy</Text>
          <Text style={styles.bulletItem}>• We do not grant OpenAI permission to use your data to train their models</Text>
          <Text style={styles.bulletItem}>• We track token usage for billing and optimization purposes</Text>
          <Text style={styles.bulletItem}>• We implement security measures to protect data in transit</Text>
        </View>

        <Text style={styles.sectionTitle}>9. Mobile App Permissions</Text>
        <Text style={styles.paragraph}>
          Our SafeHMO app is exclusively available as a mobile application for iOS and Android devices. We may request certain permissions to access your device's functionality, including:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Camera: To scan documents (only accessed when you use the scan feature)</Text>
          <Text style={styles.bulletItem}>• Storage/Files: To access and upload PDF documents</Text>
          <Text style={styles.bulletItem}>• Network Access: To communicate with our servers and the OpenAI API</Text>
        </View>
        <Text style={styles.paragraph}>
          You can manage these permissions through your device settings at any time.
        </Text>

        <Text style={styles.subSectionTitle}>9.1 Push Notifications</Text>
        <Text style={styles.paragraph}>
          With your consent, we may send push notifications to your mobile device. You can disable push notifications at any time by adjusting your device settings.
        </Text>

        <Text style={styles.subSectionTitle}>9.2 App Store Data Collection</Text>
        <Text style={styles.paragraph}>
          Apple App Store and Google Play Store may collect certain usage and crash data in accordance with their respective privacy policies. This collection is governed by Apple and Google and is subject to their terms.
        </Text>

        <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your data may be transferred to, and processed in, countries other than the country in which you are resident. These countries may have data protection laws that are different from the laws of your country. Specifically, our servers are located in the European Union, and we use OpenAI's services which process data in the United States.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date. We encourage you to review this Privacy Policy frequently to stay informed about how we are protecting your information.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us:
        </Text>
        <Text style={styles.paragraph}>
          Address: 18 Prior Deram Walk, Coventry CV4 8FT
        </Text>
        <Text style={styles.paragraph}>
          Phone: 02477 360021
        </Text>
        <Text style={styles.paragraph}>
          Email: info@safehmo.co.uk
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffa000',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffa000',
    marginTop: 24,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 6,
  },
  contactInfo: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    marginTop: 8,
    marginBottom: 24,
    fontWeight: '500',
  },
});
