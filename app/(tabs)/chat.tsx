import React from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { Chatbot } from '../../components/ui/Chatbot';
import { useNetwork } from '../../context/NetworkContext';

export default function ChatScreen() {
  const { isConnected } = useNetwork();

  return (
    <SafeAreaView style={styles.container}>
      <Chatbot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
});