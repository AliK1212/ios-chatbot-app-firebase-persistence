import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { Colors } from '../../constants/Colors';
import { STORAGE_PATHS } from '../../firebase/config';

/**
 * A component to test Firebase Storage access and display available PDFs
 */
export default function StorageAccessTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfs, setPdfs] = useState<{name: string, url: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const testStorageAccess = async () => {
    setIsLoading(true);
    setError(null);
    setPdfs([]);
    setLogs([]);
    
    try {
      addLog('Testing Firebase Storage access...');
      
      // Get storage reference
      const storage = getStorage();
      
      // Try both storage paths
      const paths = ['pdf_documents/', 'pdfs/'];
      
      for (const path of paths) {
        try {
          addLog(`Checking path: ${path}`);
          const storageRef = ref(storage, path);
          
          // List all items
          const listResult = await listAll(storageRef);
          
          addLog(`Found ${listResult.items.length} items in ${path}`);
          
          // Get download URLs for each item
          const pdfItems = await Promise.all(
            listResult.items.map(async (item) => {
              try {
                const url = await getDownloadURL(item);
                addLog(`Got URL for ${item.name}`);
                return { name: item.name, url };
              } catch (error: any) {
                addLog(`Error getting URL for ${item.name}: ${error.message || String(error)}`);
                return null;
              }
            })
          );
          
          // Filter out nulls and add to pdfs
          const validPdfs = pdfItems.filter(item => item !== null) as {name: string, url: string}[];
          setPdfs(prev => [...prev, ...validPdfs]);
        } catch (error: any) {
          addLog(`Error accessing path ${path}: ${error.message || String(error)}`);
        }
      }
      
      addLog('Storage access test completed');
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      setError(`Error testing storage access: ${errorMessage}`);
      addLog(`ERROR: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test storage access on component mount
  useEffect(() => {
    testStorageAccess();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Storage Access Test</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={testStorageAccess}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Storage Access'}
        </Text>
        {isLoading && <ActivityIndicator color="#fff" style={styles.loader} />}
      </TouchableOpacity>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>Available PDFs ({pdfs.length}):</Text>
        {pdfs.length > 0 ? (
          <ScrollView style={styles.pdfList}>
            {pdfs.map((pdf, index) => (
              <View key={index} style={styles.pdfItem}>
                <Text style={styles.pdfName}>{pdf.name}</Text>
                <Text style={styles.pdfUrl} numberOfLines={1} ellipsizeMode="middle">
                  {pdf.url}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noResults}>
            {isLoading ? 'Loading...' : 'No PDFs found'}
          </Text>
        )}
      </View>
      
      <View style={styles.logsContainer}>
        <Text style={styles.sectionTitle}>Logs:</Text>
        <ScrollView style={styles.logsList}>
          {logs.map((log, index) => (
            <Text 
              key={index} 
              style={[
                styles.logItem, 
                log.includes('ERROR') && styles.errorLog
              ]}
            >
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  pdfList: {
    maxHeight: 150,
  },
  pdfItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pdfName: {
    fontWeight: 'bold',
    color: '#333',
  },
  pdfUrl: {
    fontSize: 12,
    color: '#666',
  },
  noResults: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  logsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 2,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    paddingVertical: 2,
    color: '#333',
  },
  errorLog: {
    color: '#c62828',
    fontWeight: 'bold',
  },
});
