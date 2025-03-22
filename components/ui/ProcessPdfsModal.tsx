import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
  Alert
} from 'react-native';
import { processStoragePdfs } from '../../firebase/pdfService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { testCorsForAllPdfs } from '../../utils/cors-test';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../../firebase/config';

interface ProcessPdfsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ProcessPdfsModal({ isVisible, onClose }: ProcessPdfsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [prefix, setPrefix] = useState('pdf_documents/');
  const [delimiter, setDelimiter] = useState('/');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pdfsFound, setPdfsFound] = useState<string[]>([]);

  useEffect(() => {
    // Check if the current user is an admin by checking role in Firestore
    const checkAdminRole = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const db = getFirestore();
          const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            console.log("User has admin role - enabling admin features");
            setIsAdmin(true);
          } else {
            console.log("User is not an admin");
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      }
    };
    
    checkAdminRole();

    // Auto-check storage access when modal opens
    if (isVisible) {
      checkStorageAccess();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isVisible, fadeAnim]);

  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, message]);
  };

  const checkStorageAccess = async () => {
    try {
      addLog('Testing Firebase Storage access...');
      const storage = getStorage();
      const storageRef = ref(storage, prefix);
      
      addLog(`Attempting to list files in ${prefix}...`);
      const result = await listAll(storageRef);
      
      addLog(`Successfully accessed storage. Found ${result.items.length} items.`);
      
      // Store the list of PDFs found
      const pdfNames = result.items.map(item => item.name);
      setPdfsFound(pdfNames);
      
      if (result.items.length === 0) {
        addLog('Warning: No PDF files found in the specified location.');
        return true; // Still return true because we have access
      } else {
        // List the PDFs found
        addLog('PDFs found in storage:');
        pdfNames.forEach((name, index) => {
          addLog(`${index + 1}. ${name}`);
        });
      }
      
      // Test CORS configuration
      addLog('Testing CORS configuration...');
      
      // First, try to get a download URL for one of the items
      if (result.items.length > 0) {
        try {
          const firstItem = result.items[0];
          addLog(`Testing download URL for ${firstItem.name}...`);
          const downloadUrl = await getDownloadURL(firstItem);
          addLog(`Successfully got download URL: ${downloadUrl}`);
          
          // Now test if we can fetch this URL
          addLog(`Testing fetch access to ${firstItem.name}...`);
          const response = await fetch(downloadUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Origin': window.location.origin
            }
          });
          
          if (response.ok) {
            addLog(`Successfully fetched ${firstItem.name} with status ${response.status}`);
          } else {
            addLog(`Failed to fetch ${firstItem.name}: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError: any) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
          addLog(`Error testing file access: ${errorMessage}`);
          
          if (errorMessage.includes('CORS')) {
            addLog('CORS error detected. Firebase Storage CORS configuration may be incorrect.');
          }
        }
      }
      
      // Run the full CORS test
      const corsTest = await testCorsForAllPdfs(prefix);
      
      if (corsTest.overallSuccess) {
        addLog('CORS configuration is working correctly!');
      } else {
        if (corsTest.error) {
          addLog(`CORS test error: ${corsTest.error}`);
        } else {
          addLog('CORS configuration issues detected:');
          corsTest.results.forEach(result => {
            if (!result.success) {
              addLog(`- ${result.path}: Failed - ${result.details.error || 'Unknown error'}`);
            }
          });
          
          addLog('You may need to configure CORS for your Firebase Storage bucket.');
          addLog('See the firebase-cors-setup.txt file for instructions.');
        }
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`ERROR: Failed to access Firebase Storage: ${errorMessage}`);
      setError(`Storage access error: ${errorMessage}`);
      
      // Provide more specific guidance based on the error
      if (errorMessage.includes('permission-denied') || errorMessage.includes('unauthorized')) {
        addLog('This appears to be a Firebase Storage permissions issue. Check your storage rules.');
      } else if (errorMessage.includes('not-found')) {
        addLog(`The path "${prefix}" may not exist in your Firebase Storage bucket.`);
      } else if (errorMessage.includes('network')) {
        addLog('This appears to be a network connectivity issue. Check your internet connection.');
      }
      
      return false;
    }
  };

  const handleProcessPdfs = async () => {
    console.log("Process PDFs button clicked");
    
    if (!isAdmin) {
      Alert.alert(
        "Permission Denied",
        "Only admin users can process PDF documents.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setIsProcessing(true);
    setLogs([]);
    setError(null);
    setIsComplete(false);

    try {
      addLog(`Starting to process PDFs from Firebase Storage...`);
      addLog(`Using prefix: ${prefix}`);
      addLog(`Using delimiter: ${delimiter}`);
      
      // First check if we can access the storage
      const canAccessStorage = await checkStorageAccess();
      if (!canAccessStorage) {
        addLog('Cannot proceed due to storage access issues.');
        setIsProcessing(false);
        return;
      }
      
      // Check if we found any PDFs
      if (pdfsFound.length === 0) {
        addLog('No PDFs found to process. Please check your storage path.');
        setIsProcessing(false);
        return;
      }
      
      addLog(`Found ${pdfsFound.length} PDFs to process.`);
      
      // Override console.log to capture logs
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (message: any, ...optionalParams: any[]) => {
        originalConsoleLog(message, ...optionalParams);
        addLog(typeof message === 'string' ? message : JSON.stringify(message));
      };
      
      console.error = (message: any, ...optionalParams: any[]) => {
        originalConsoleError(message, ...optionalParams);
        const errorMessage = typeof message === 'string' ? message : JSON.stringify(message);
        addLog(`ERROR: ${errorMessage}`);
        setError(errorMessage);
      };
      
      try {
        // Call the processStoragePdfs function with prefix
        addLog('Calling processStoragePdfs function...');
        addLog(`Debug: Process started at ${new Date().toISOString()}`);
        const result = await processStoragePdfs(prefix);
        addLog(`Debug: Got result: ${JSON.stringify(result, null, 2)}`);
        
        // Since processStoragePdfs now returns void, we check for errors differently
        if (result && result.success) {
          addLog(`PDF processing completed successfully! Processed ${result.processedCount} document(s)`);
          setIsComplete(true);
        } else if (result) {
          // Processing returned but with errors
          addLog(`Processing completed with ${result.errorCount} error(s)`);
          if (result.errors && result.errors.length > 0) {
            result.errors.forEach((error, index) => {
              addLog(`Error ${index + 1}: ${JSON.stringify(error)}`);
            });
          }
        }
      } catch (processingError) {
        if (processingError instanceof Error) {
          const errorMsg = processingError.message;
          
          if (errorMsg.includes('not fully implemented') || 
              errorMsg.includes('integrate') || 
              errorMsg.includes('OpenAI API key not configured')) {
            // This is an expected error in production environment
            addLog('IMPLEMENTATION REQUIRED: ' + errorMsg);
            setError('The PDF processing functionality requires implementation of a PDF parsing library and embedding service. Please check the documentation for integration instructions.');
            
            // Check if OpenAI API key is missing
            if (errorMsg.includes('OpenAI API key not configured')) {
              addLog('ERROR: OpenAI API key is missing or invalid. Check your .env file and make sure OPENAI_API_KEY is set correctly.');
            }
          } else if (errorMsg.includes('CORS')) {
            // CORS-related error
            addLog('CORS ERROR: ' + errorMsg);
            setError('CORS configuration issue detected. Please configure CORS for your Firebase Storage bucket using the instructions in firebase-cors-setup.txt.');
          } else {
            // This is an unexpected error
            addLog(`ERROR: ${errorMsg}`);
            setError(`Error: ${errorMsg}`);
          }
        } else {
          // This is an unexpected non-Error object
          const errorMessage = String(processingError);
          addLog(`ERROR: ${errorMessage}`);
          setError(`Error: ${errorMessage}`);
        }
      }
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMessage}`);
      addLog(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Process PDFs from Storage</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Storage Path Prefix:</Text>
            <TextInput 
              style={styles.inputField}
              value={prefix}
              onChangeText={setPrefix}
              placeholder="pdfs/"
              editable={!isProcessing && isAdmin}
            />
            <Text style={styles.inputHint}>The folder in Firebase Storage where PDFs are stored</Text>
            
            <Text style={styles.inputLabel}>Delimiter:</Text>
            <TextInput 
              style={styles.inputField}
              value={delimiter}
              onChangeText={setDelimiter}
              placeholder="/"
              editable={!isProcessing && isAdmin}
            />
            <Text style={styles.inputHint}>Path delimiter character (usually /)</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={() => {
                console.log("Test Storage Access button clicked");
                checkStorageAccess();
              }}
              disabled={isProcessing || !isAdmin}
            >
              <Text style={styles.buttonText}>Test Storage Access</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, isProcessing ? styles.disabledButton : styles.primaryButton]} 
              onPress={() => {
                console.log("Process PDFs button clicked");
                handleProcessPdfs();
              }}
              disabled={isProcessing || !isAdmin}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Processing...' : 'Process PDFs'}
              </Text>
              {isProcessing && <ActivityIndicator color="#fff" style={styles.loader} />}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('implementation') && (
                <TouchableOpacity 
                  style={styles.docsButton}
                  onPress={() => Alert.alert(
                    "Implementation Required",
                    "To implement PDF processing in production, you need to:\n\n1. Install a PDF parsing library (like pdf.js)\n2. Configure OpenAI API for embeddings\n3. Update the extractTextFromPdf and createEmbedding functions in pdfService.ts\n\nSee PDF_PROCESSING_README.md for details."
                  )}
                >
                  <Text style={styles.docsButtonText}>View Implementation Guide</Text>
                </TouchableOpacity>
              )}
              {error.includes('CORS') && (
                <TouchableOpacity 
                  style={styles.docsButton}
                  onPress={() => Alert.alert(
                    "CORS Configuration Required",
                    "To fix CORS issues, you need to configure CORS for your Firebase Storage bucket:\n\n1. Install Google Cloud SDK\n2. Run: gsutil cors set cors.json gs://safehmo-demo.firebasestorage.app\n\nSee docs/firebase-cors-setup.txt for detailed instructions."
                  )}
                >
                  <Text style={styles.docsButtonText}>View CORS Setup Guide</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {logs.length > 0 && (
            <View style={styles.logsContainer}>
              <Text style={styles.logsTitle}>Processing Logs:</Text>
              <ScrollView style={styles.logsScrollView}>
                {logs.map((log, index) => (
                  <Text 
                    key={index} 
                    style={[
                      styles.logText,
                      log.includes('ERROR') && styles.errorLogText,
                      log.includes('Warning') && styles.warningLogText,
                      log.includes('IMPLEMENTATION REQUIRED') && styles.implementationLogText
                    ]}
                  >
                    {log}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}
          
          {isComplete && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.successText}>Processing completed successfully!</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.blackWithOpacity(0.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputField: {
    height: 40,
    borderColor: Colors.gray.medium,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: Colors.primaryWithOpacity(0.1),
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  docsButton: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  docsButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  logsContainer: {
    flex: 1,
    marginTop: 16,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text.primary,
  },
  logsScrollView: {
    flex: 1,
    backgroundColor: Colors.gray.light,
    padding: 8,
    borderRadius: 4,
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: Colors.text.primary,
  },
  errorLogText: {
    color: Colors.error,
  },
  warningLogText: {
    color: Colors.brand, // Orange for warnings
  },
  implementationLogText: {
    color: Colors.primary, // Blue for implementation notes
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successWithOpacity(0.1),
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.success,
    fontWeight: 'bold',
  },
});
