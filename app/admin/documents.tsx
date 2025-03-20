import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Title, Paragraph, DataTable, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { ArrowLeft, Upload, Trash2, FileText, Plus, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useUser } from '../../context/UserContext';
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { COLLECTIONS, STORAGE_PATHS } from '../../firebase/config';
import { processPdfDocument } from '../../firebase/pdfService';

// Define types for document data
interface PdfDocument {
  id: string;
  title: string;
  description: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  processed: boolean;
}

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [processingDoc, setProcessingDoc] = useState(false);
  
  const { userProfile } = useUser();
  const router = useRouter();
  
  // Redirect non-admin users
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      router.replace('/');
    } else {
      loadDocuments();
    }
  }, [userProfile, router]);
  
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const docsRef = collection(db, COLLECTIONS.PDF_DOCUMENTS);
      const snapshot = await getDocs(docsRef);
      
      const docsList: PdfDocument[] = [];
      snapshot.forEach((doc) => {
        docsList.push({
          id: doc.id,
          ...doc.data() as Omit<PdfDocument, 'id'>
        });
      });
      
      setDocuments(docsList);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };
  
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return;
      }
      
      setSelectedFile(result.assets[0]);
      setDialogVisible(true);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };
  
  const uploadDocument = async () => {
    if (!selectedFile || !documentTitle) {
      Alert.alert('Error', 'Please provide a title and select a file');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Get file data
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storage = getStorage();
      const filename = selectedFile.name;
      const storageRef = ref(storage, `${STORAGE_PATHS.PDF_DOCUMENTS}/${filename}`);
      
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      // Listen for upload progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          Alert.alert('Error', 'Failed to upload document');
          setUploading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save document metadata to Firestore
          const db = getFirestore();
          const docRef = await addDoc(collection(db, COLLECTIONS.PDF_DOCUMENTS), {
            title: documentTitle,
            description: documentDescription || '',
            filename: filename,
            fileUrl: downloadURL,
            fileSize: selectedFile.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: userProfile?.uid || 'unknown',
            processed: false
          });
          
          // Process the PDF for vector search
          setProcessingDoc(true);
          await processPdfDocument(downloadURL, documentTitle, documentDescription || 'No description provided', false);
          
          // Update document as processed
          await updateDoc(doc(db, COLLECTIONS.PDF_DOCUMENTS, docRef.id), {
            processed: true
          });
          
          // Reset state and reload documents
          setDialogVisible(false);
          setSelectedFile(null);
          setDocumentTitle('');
          setDocumentDescription('');
          setUploading(false);
          setProcessingDoc(false);
          loadDocuments();
          
          Alert.alert('Success', 'Document uploaded and processed successfully');
        }
      );
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
      setUploading(false);
      setProcessingDoc(false);
    }
  };
  
  const deleteDocument = async (documentId: string, fileUrl: string) => {
    try {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this document? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              // Delete from Firestore
              const db = getFirestore();
              await deleteDoc(doc(db, COLLECTIONS.PDF_DOCUMENTS, documentId));
              
              // Delete from Storage
              if (fileUrl) {
                const storage = getStorage();
                const storageRef = ref(storage, fileUrl);
                await deleteObject(storageRef);
              }
              
              // Delete all chunks associated with this document
              const chunksRef = collection(db, COLLECTIONS.PDF_CHUNKS);
              const chunksSnapshot = await getDocs(chunksRef);
              
              const deletePromises: Promise<void>[] = [];
              chunksSnapshot.forEach((chunk) => {
                const chunkData = chunk.data();
                if (chunkData.documentId === documentId) {
                  deletePromises.push(deleteDoc(doc(db, COLLECTIONS.PDF_CHUNKS, chunk.id)));
                }
              });
              
              await Promise.all(deletePromises);
              
              // Reload documents
              loadDocuments();
              Alert.alert('Success', 'Document deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting document:', error);
      Alert.alert('Error', 'Failed to delete document');
      setLoading(false);
    }
  };
  
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA026" />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Button 
            icon={({ size, color }: { size: number, color: string }) => <ArrowLeft size={size} color={color} />}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Back
          </Button>
          <Title style={styles.title}>Document Management</Title>
        </View>
        
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>PDF Document Library</Title>
            <Paragraph>
              Upload and manage PDF documents for the chatbot. Documents will be processed for vector search
              and made available to users for querying.
            </Paragraph>
          </Card.Content>
        </Card>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA026" />
          </View>
        ) : (
          <>
            <DataTable style={styles.table}>
              <DataTable.Header>
                <DataTable.Title>Document</DataTable.Title>
                <DataTable.Title numeric>Size</DataTable.Title>
                <DataTable.Title numeric>Actions</DataTable.Title>
              </DataTable.Header>
              
              {documents.length === 0 ? (
                <View style={styles.emptyState}>
                  <FileText size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No documents found</Text>
                  <Text style={styles.emptySubtext}>Upload a PDF to get started</Text>
                </View>
              ) : (
                documents.map((doc) => (
                  <DataTable.Row key={doc.id}>
                    <DataTable.Cell>
                      <View style={styles.documentCell}>
                        <FileText size={20} color="#FFA026" />
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentTitle}>{doc.title}</Text>
                          <Text style={styles.documentDescription} numberOfLines={1}>
                            {doc.description || 'No description'}
                          </Text>
                        </View>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      {formatFileSize(doc.fileSize)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Button
                        icon={({ size, color }: { size: number, color: string }) => <Trash2 size={size} color={color} />}
                        onPress={() => deleteDocument(doc.id, doc.fileUrl)}
                        mode="text"
                        textColor="red"
                      >
                        Delete
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))
              )}
            </DataTable>
          </>
        )}
      </ScrollView>
      
      <FAB
        icon={({ size, color }: { size: number, color: string }) => <Plus size={size} color={color} />}
        style={styles.fab}
        onPress={pickDocument}
        disabled={uploading || processingDoc}
      />
      
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Upload Document</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Document Title *"
              value={documentTitle}
              onChangeText={setDocumentTitle}
              style={styles.input}
            />
            <TextInput
              label="Description (Optional)"
              value={documentDescription}
              onChangeText={setDocumentDescription}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            {selectedFile && (
              <View style={styles.selectedFile}>
                <FileText size={20} color="#FFA026" />
                <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  {processingDoc ? 'Processing document...' : `Uploading: ${Math.round(uploadProgress)}%`}
                </Text>
                <ActivityIndicator size="small" color="#FFA026" />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={uploading || processingDoc}>
              Cancel
            </Button>
            <Button 
              onPress={uploadDocument} 
              mode="contained" 
              style={styles.uploadButton}
              disabled={uploading || processingDoc || !selectedFile || !documentTitle}
            >
              Upload
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  loadingContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  documentCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  documentTitle: {
    fontWeight: 'bold',
  },
  documentDescription: {
    fontSize: 12,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFA026',
  },
  input: {
    marginBottom: 16,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  selectedFileName: {
    marginLeft: 8,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  progressText: {
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#FFA026',
  },
});
