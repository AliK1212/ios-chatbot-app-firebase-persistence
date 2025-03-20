import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { processStoragePdfs } from '../firebase/pdfService';
import StorageAccessTest from '../components/ui/StorageAccessTest';
import ProcessPdfsModal from '../components/ui/ProcessPdfsModal';

/**
 * Debug page for testing PDF processing functionality
 */
export default function DebugScreen() {
  const [activeTab, setActiveTab] = useState<'storage' | 'process'>('storage');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleProcessPdfs = async () => {
    try {
      addLog('Starting PDF processing...');
      await processStoragePdfs('pdf_documents/');
      addLog('PDF processing completed successfully!');
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      addLog(`ERROR: ${errorMessage}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PDF Chatbot Debug Tools</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'storage' && styles.activeTab]} 
          onPress={() => setActiveTab('storage')}
        >
          <Text style={[styles.tabText, activeTab === 'storage' && styles.activeTabText]}>
            Storage Test
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'process' && styles.activeTab]} 
          onPress={() => setActiveTab('process')}
        >
          <Text style={[styles.tabText, activeTab === 'process' && styles.activeTabText]}>
            Process PDFs
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        {activeTab === 'storage' && (
          <StorageAccessTest />
        )}
        
        {activeTab === 'process' && (
          <View style={styles.processContainer}>
            <Text style={styles.sectionTitle}>Process PDFs from Storage</Text>
            <Text style={styles.description}>
              This tool will process PDF documents from Firebase Storage, extract text, 
              generate embeddings, and store them in Firestore.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.buttonText}>Open Process Modal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleProcessPdfs}
              >
                <Text style={styles.buttonText}>Quick Process</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.logsContainer}>
              <View style={styles.logsHeader}>
                <Text style={styles.logsTitle}>Logs:</Text>
                <TouchableOpacity onPress={clearLogs}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.logs}>
                {logs.length === 0 ? (
                  <Text style={styles.noLogsText}>No logs yet</Text>
                ) : (
                  logs.map((log, index) => (
                    <Text 
                      key={index} 
                      style={[
                        styles.logItem,
                        log.includes('ERROR') && styles.errorLog
                      ]}
                    >
                      {log}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
      
      <ProcessPdfsModal 
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  processContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    color: '#3498db',
    fontSize: 14,
  },
  logs: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
  errorLog: {
    color: '#e74c3c',
  },
  noLogsText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});
