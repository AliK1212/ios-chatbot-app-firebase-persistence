import { getFirestore } from 'firebase/firestore';
import { collection, addDoc, doc, getDoc, updateDoc, getDocs, query, where, orderBy, limit, CollectionReference, serverTimestamp, Timestamp } from 'firebase/firestore';
import { DocumentChunk, DocumentMetadata } from '../utils/document-processor';

/**
 * Update document status in Firestore
 */
export async function updateDocumentStatus(
  chatbotId: string, 
  documentId: string, 
  status: string, 
  additionalData: Record<string, any> = {}
): Promise<boolean> {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'chatbots', chatbotId, 'documents', documentId);
    
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    await updateDoc(docRef, updateData);
    console.log(`Updated document ${documentId} status to ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating document ${documentId} status:`, error);
    return false;
  }
}

/**
 * Store document chunk with embedding in Firestore
 */
export async function storeDocumentChunk(
  chatbotId: string,
  documentId: string,
  chunk: string,
  embedding: number[],
  metadata: {
    title: string;
    page: string;
    source: string;
    fileName: string;
    chunkIndex: number;
    [key: string]: any;
  }
): Promise<string | null> {
  try {
    // Create embeddings collection reference
    const db = getFirestore();
    const embeddingsRef = collection(db, 'chatbots', chatbotId, 'embeddings');
    
    // Create document chunk
    const documentChunk: DocumentChunk = {
      id: `${documentId}_${Date.now()}`,
      text: chunk,
      documentId,
      embedding,
      index: 0, 
      createdAt: Timestamp.now()
    };
    
    // Add chunk to embeddings collection
    const docRef = await addDoc(embeddingsRef, documentChunk);
    return docRef.id;
  } catch (error) {
    console.error('Error storing document chunk:', error);
    
    // Try again with a simplified chunk (without the embedding)
    try {
      console.log('Attempting to save chunk without embedding');
      const db = getFirestore();
      const embeddingsRef = collection(db, 'chatbots', chatbotId, 'embeddings');
      
      const simplifiedChunk = {
        id: `${documentId}_${Date.now()}`,
        text: chunk,
        documentId,
        index: 0,
        createdAt: Timestamp.now(),
        embeddingError: "Embedding could not be stored, will be regenerated on query"
      };
      
      const docRef = await addDoc(embeddingsRef, simplifiedChunk);
      return docRef.id;
    } catch (retryError) {
      console.error('Failed to save simplified chunk:', retryError);
      return null;
    }
  }
}

/**
 * Get document metadata from Firestore
 */
export async function getDocumentMetadata(
  chatbotId: string, 
  documentId: string
): Promise<Record<string, any> | null> {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'chatbots', chatbotId, 'documents', documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`Document ${documentId} not found`);
      return null;
    }
    
    return docSnap.data();
  } catch (error) {
    console.error(`Error getting document ${documentId} metadata:`, error);
    return null;
  }
}

/**
 * Find similar documents based on embedding
 */
export async function findSimilarDocuments(
  chatbotId: string,
  embedding: number[],
  limit: number = 5
): Promise<DocumentChunk[]> {
  try {
    // Get all embeddings for the chatbot
    const db = getFirestore();
    const embeddingsRef = collection(db, 'chatbots', chatbotId, 'embeddings');
    const embeddingsQuery = query(embeddingsRef);
    const embeddingsSnap = await getDocs(embeddingsQuery);
    
    if (embeddingsSnap.empty) {
      console.log(`No embeddings found for chatbot ${chatbotId}`);
      return [];
    }
    
    // Calculate similarity for each embedding
    const similarityScores: {chunk: DocumentChunk; similarity: number}[] = [];
    
    embeddingsSnap.forEach(doc => {
      const chunk = doc.data() as DocumentChunk;
      
      // Skip chunks without embeddings
      if (!chunk.embedding || chunk.embedding.length === 0) {
        return;
      }
      
      // Calculate cosine similarity
      let dotProduct = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;
      
      for (let i = 0; i < embedding.length; i++) {
        if (i < chunk.embedding.length) {
          dotProduct += embedding[i] * chunk.embedding[i];
          magnitude1 += embedding[i] * embedding[i];
          magnitude2 += chunk.embedding[i] * chunk.embedding[i];
        }
      }
      
      magnitude1 = Math.sqrt(magnitude1);
      magnitude2 = Math.sqrt(magnitude2);
      
      // Avoid division by zero
      if (magnitude1 === 0 || magnitude2 === 0) {
        return;
      }
      
      // Calculate cosine similarity
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      similarityScores.push({
        chunk,
        similarity
      });
    });
    
    // Sort by similarity (highest first) and take the top results
    const topResults = similarityScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.chunk);
    
    return topResults;
  } catch (error) {
    console.error('Error finding similar documents:', error);
    return [];
  }
}

/**
 * Verify embeddings exist for documents
 */
export async function verifyDocumentEmbeddings(embeddingsRef: CollectionReference): Promise<{
  total: number;
  withEmbeddings: number;
  missingEmbeddings: number;
}> {
  try {
    const snapshot = await getDocs(embeddingsRef);
    
    let total = 0;
    let withEmbeddings = 0;
    let missingEmbeddings = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      total++;
      
      if (data.embedding && Array.isArray(data.embedding) && data.embedding.length > 0) {
        withEmbeddings++;
      } else {
        missingEmbeddings++;
      }
    });
    
    return {
      total,
      withEmbeddings,
      missingEmbeddings
    };
  } catch (error: any) {
    console.error('Error verifying document embeddings:', error);
    throw error;
  }
}
