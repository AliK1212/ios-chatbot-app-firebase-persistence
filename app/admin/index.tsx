import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Card, Button, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { BarChart } from 'lucide-react-native';
import { FileText } from 'lucide-react-native';

export default function AdminDashboard() {
  const { userProfile } = useUser();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      router.replace('/');
    }
  }, [userProfile, router]);

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Title style={styles.title}>Admin Dashboard</Title>
        <Text style={styles.subtitle}>Manage your Safe HMO application</Text>

        <View style={styles.cardsContainer}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <FileText size={24} color="#FFA026" />
                <Title style={styles.cardTitle}>Document Management</Title>
              </View>
              <Paragraph>Upload, manage, and organize PDF documents for the chatbot.</Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="contained" 
                onPress={() => router.push('/admin/documents')}
                style={styles.button}
              >
                Manage Documents
              </Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <BarChart size={24} color="#FFA026" />
                <Title style={styles.cardTitle}>Token Usage Analytics</Title>
              </View>
              <Paragraph>View AI token usage statistics and costs.</Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="contained" 
                onPress={() => router.push('/admin/token-usage')}
                style={styles.button}
              >
                View Analytics
              </Button>
            </Card.Actions>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 18,
    color: '#333',
  },
  button: {
    backgroundColor: '#FFA026',
  }
});
