/**
 * PDF Service
 * Handles PDF processing, text extraction, embedding generation, and vector search
 */

// Import Buffer polyfill for browser environments
import '../utils/buffer-polyfill';

// Detect if we're in a React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
console.log(`[pdfService] Running in ${isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js'} environment`);

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  addDoc, 
  updateDoc, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  listAll, 
  getDownloadURL,
  uploadBytes,
  deleteObject
} from 'firebase/storage';
import { processDocumentCompat } from '../utils/document-processor';
import { generateEmbedding } from '../utils/embedding-service';
import OpenAI from 'openai';
import { 
  ChatCompletionSystemMessageParam, 
  ChatCompletionUserMessageParam,
  ChatCompletionMessageParam
} from 'openai/resources';
import type { ChatCompletionAssistantMessageParam } from 'openai/resources/chat/completions';
import { COLLECTIONS, VECTOR_CONFIG, STORAGE_PATHS, OPENAI_CONFIG } from './config';
import { extractTextFromDocument } from '../utils/text-extractor';
import { splitTextIntoChunks } from '../utils/chunking-service';
import { calculateSimilarity } from '../utils/embedding-service';
import { cosineSimilarity, verifyDocumentRelevance } from '../utils/vector-utils';
import Constants from 'expo-constants';
import { calculateTokens, calculateTokenUsage } from '../utils/token-counter';

// Initialize OpenAI with API key
let apiKey = OPENAI_CONFIG.API_KEY;

// Try to get from Expo Constants if available
if (Constants && Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.openai) {
  apiKey = Constants.expoConfig.extra.openai.apiKey || apiKey;
  console.log('[pdfService] Using API key from Expo Constants');
}

const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true // Allow usage in browser environments
});

// Get Firestore instance
const db = getFirestore();

// Cache for storing embeddings to avoid redundant API calls
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>();
const EMBEDDING_CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Extract text from a PDF file
 * @param fileUrl URL to the PDF file
 * @returns Extracted text from the PDF
 */
export const extractTextFromPdf = async (fileUrl: string): Promise<string> => {
  try {
    console.log(`Extracting text from PDF: ${fileUrl}`);
    
    // Download the PDF file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);
    
    // Extract text using the proper PDF extraction utility
    const fileName = fileUrl.split('/').pop() || 'document.pdf';
    const { text } = await extractTextFromDocument(buffer, fileName);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Failed to extract text from PDF');
    }
    
    console.log(`Successfully extracted ${text.length} characters from PDF`);
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return `Error extracting text: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Generate an embedding for a text string using OpenAI
 * @param text Text to generate embedding for
 * @returns Vector embedding as an array of numbers
 */
export const createEmbedding = async (text: string): Promise<number[]> => {
  try {
    console.log(`Creating embedding for text (${text.length} chars)...`);
    
    // Create a cache key based on the first 100 chars of text
    const cacheKey = text.substring(0, 100);
    
    // Check if we have a cached embedding
    const cachedEmbedding = embeddingCache.get(cacheKey);
    if (cachedEmbedding && (Date.now() - cachedEmbedding.timestamp) < EMBEDDING_CACHE_EXPIRATION_MS) {
      console.log('[pdfService] Using cached embedding');
      return cachedEmbedding.embedding;
    }
    
    // Use the proper embedding service from utils
    const embedding = await generateEmbedding(text);
    
    // Cache the embedding
    embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });
    
    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    // Return a zero embedding as fallback
    return Array.from({ length: VECTOR_CONFIG.DIMENSIONS }, () => 0);
  }
};

/**
 * Split text into chunks for vector storage
 * @param text Text to split into chunks
 * @param chunkSize Maximum size of each chunk
 * @param overlap Overlap between chunks to maintain context
 * @returns Array of chunks with page number estimation
 */
export const splitIntoChunks = (
  text: string, 
  chunkSize: number = 1000, 
  overlap: number = 200
): Array<{ text: string, pageNumber: number }> => {
  if (!text || text.length === 0) {
    return [];
  }
  
  try {
    // Use the proper text chunking service from utils
    const chunks = splitTextIntoChunks(text, chunkSize, overlap);
    
    // Convert to the expected format with page number estimation
    const avgCharsPerPage = 3000; // Rough estimate of characters per page
    return chunks.map((chunkText, index) => {
      // Estimate page number based on position in document
      const startPosition = index * (chunkSize - overlap);
      const estimatedPage = Math.floor(startPosition / avgCharsPerPage) + 1;
      
      return {
        text: chunkText,
        pageNumber: estimatedPage
      };
    });
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    
    // Fallback to simple chunking if the utility fails
    const chunks: Array<{ text: string, pageNumber: number }> = [];
    const avgCharsPerPage = 3000; // Rough estimate of characters per page
    
    let i = 0;
    while (i < text.length) {
      // Calculate end position for this chunk
      let end = i + chunkSize;
      if (end > text.length) {
        end = text.length;
      } else {
        // Try to find a natural break point (period followed by space or newline)
        const naturalBreak = text.substring(i, end).lastIndexOf('. ');
        if (naturalBreak !== -1 && naturalBreak > chunkSize / 2) {
          end = i + naturalBreak + 2; // Include the period and space
        }
      }
      
      const chunkText = text.substring(i, end);
      const start = i;
      
      // Estimate page number based on position in document
      const estimatedPage = Math.floor(start / avgCharsPerPage) + 1;
      
      chunks.push({
        text: chunkText,
        pageNumber: estimatedPage
      });
      
      // Move to next chunk with overlap
      i = end - overlap;
      if (i <= start) {
        i = end; // Prevent infinite loop if overlap is too large
      }
    }
    
    return chunks;
  }
};

/**
 * Store a document chunk with its embedding in Firestore
 * @param params Document chunk parameters
 */
export const storeDocumentChunk = async ({
  documentId,
  documentTitle,
  pageNumber,
  content,
  embedding,
  chunkIndex = 0
}: {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  content: string;
  embedding: number[];
  chunkIndex?: number;
}): Promise<string> => {
  try {
    const db = getFirestore();
    const chunkData = {
      documentId,
      documentTitle,
      pageNumber,
      content,
      embedding,
      chunkIndex,
      createdAt: serverTimestamp()
    };
    
    const chunkRef = await addDoc(collection(db, COLLECTIONS.CHUNKS), chunkData);
    console.log(`Chunk stored in Firestore collection: ${COLLECTIONS.CHUNKS}`);
    return chunkRef.id;
  } catch (error) {
    console.error('Error storing document chunk:', error);
    throw error;
  }
};

/**
 * Store document metadata in Firestore
 * @param params Document metadata parameters
 * @returns Document ID
 */
export const storeDocumentMetadata = async ({
  title,
  description,
  fileName,
  fileUrl,
  fileSize
}: {
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}): Promise<string> => {
  try {
    const db = getFirestore();
    const docData = {
      title,
      description,
      filename: fileName,
      fileUrl,
      fileSize,
      uploadedAt: serverTimestamp(),
      uploadedBy: 'admin',
      processed: false
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), docData);
    console.log(`Document metadata stored in Firestore collection: ${COLLECTIONS.DOCUMENTS}`);
    return docRef.id;
  } catch (error) {
    console.error('Error storing document metadata:', error);
    throw error;
  }
};

/**
 * Process all PDFs in storage
 * @param prefix The storage path prefix to search for PDFs (default: 'pdf_documents/')
 */
export async function processStoragePdfs(prefix: string = 'pdf_documents/'): Promise<{ success: boolean; processedCount: number; errorCount: number; errors: any[] }> {
  try {
    console.log(`Starting to process all PDFs in storage from path: ${prefix}`);
    console.log(`Environment: ${isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js'}`);
    
    // Check if OpenAI API key is configured
    if (!OPENAI_CONFIG.API_KEY || OPENAI_CONFIG.API_KEY === 'your-openai-api-key-here') {
      console.error('OpenAI API key is missing or invalid. Please set a valid API key in your .env file or config.ts');
      return {
        success: false,
        processedCount: 0,
        errorCount: 1,
        errors: [{
          error: 'OpenAI API key is missing or invalid',
          message: 'You must set a valid OpenAI API key in your .env file or config.ts to process PDFs'
        }]
      };
    }
    
    const storage = getStorage();
    const storageRef = ref(storage, prefix);
    
    // List all files in storage
    const result = await listAll(storageRef);
    
    console.log(`Found ${result.items.length} files in storage path: ${prefix}`);
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    
    // Process each file
    for (const item of result.items) {
      try {
        console.log(`Processing file: ${item.name}`);
        
        // Skip non-PDF files
        if (!item.name.toLowerCase().endsWith('.pdf')) {
          console.log(`Skipping non-PDF file: ${item.name}`);
          continue;
        }
        
        // Get download URL
        const downloadUrl = await getDownloadURL(item);
        console.log(`Got download URL for ${item.name}: ${downloadUrl}`);
        
        // Download the file
        console.log(`Downloading file: ${item.name}`);
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        
        // Convert to array buffer for browser compatibility
        const arrayBuffer = await response.arrayBuffer();
        
        // Process document - create a valid document ID by removing file extension and sanitizing
        const documentId = item.name.replace(/\.[^/.]+$/, ''); // Remove file extension
        console.log(`Processing document with ID: ${documentId}`);
        
        // Pass the array buffer directly instead of converting to Buffer
        await processDocument(documentId, arrayBuffer, item.name);
        console.log(`Successfully processed document: ${item.name}`);
        
        processedCount++;
      } catch (itemError) {
        console.error(`Error processing file ${item.name}:`, itemError);
        
        // Add more detailed error information for debugging
        const errorDetails = {
          file: item.name,
          error: itemError instanceof Error ? itemError.message : String(itemError),
          stack: itemError instanceof Error ? itemError.stack : undefined,
          environment: isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js',
          timestamp: new Date().toISOString()
        };
        
        errors.push(errorDetails);
        errorCount++;
        
        // Update document status in Firestore to indicate error
        try {
          const db = getFirestore();
          const documentId = item.name.replace(/\.[^/.]+$/, '');
          // Create a valid Firestore document ID by removing invalid characters
          const validDocId = documentId.replace(/[\/\.\#\$\[\]]/g, '_');
          const docRef = doc(db, COLLECTIONS.DOCUMENTS, validDocId);
          
          await setDoc(docRef, {
            id: documentId,
            fileName: item.name,
            status: 'error',
            error: errorDetails.error,
            updatedAt: Timestamp.now(),
            createdAt: Timestamp.now()
          }, { merge: true });
          
          console.log(`Updated error status for document ${documentId} in Firestore`);
        } catch (updateError) {
          console.error(`Failed to update error status for ${item.name}:`, updateError);
        }
      }
    }
    
    console.log(`Finished processing PDFs. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processedCount,
      errorCount,
      errors
    };
  } catch (error) {
    console.error('Error processing PDFs:', error);
    return {
      success: false,
      processedCount: 0,
      errorCount: 1,
      errors: [error]
    };
  }
}

/**
 * Process a document
 * @param documentId Document ID
 * @param bufferOrArrayBuffer Document buffer or array buffer
 * @param fileName Document filename
 */
export async function processDocument(
  documentId: string, 
  bufferOrArrayBuffer: ArrayBuffer | Buffer, 
  fileName: string
): Promise<{ success: boolean; metadata: any; chunks: any[]; error?: string }> {
  try {
    console.log(`[pdfService] Processing document: ${fileName}, ID: ${documentId}`);
    
    // Process document using the document processor
    const processResult = await processDocumentCompat(bufferOrArrayBuffer, fileName, documentId);
    
    // Get Firestore instance
    const db = getFirestore();
    
    // Create document metadata
    const metadata = {
      id: documentId,
      fileName,
      status: 'processed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      pageCount: processResult.metadata.pageCount || 1,
      size: Buffer.isBuffer(bufferOrArrayBuffer) 
        ? bufferOrArrayBuffer.length 
        : bufferOrArrayBuffer.byteLength,
      fileType: processResult.metadata.fileType || 'pdf',
      chunkCount: processResult.chunks.length,
    };
    
    // Create a valid Firestore document ID by removing invalid characters
    const validDocId = documentId.replace(/[\/\.\#\$\[\]]/g, '_');
    
    // Save document metadata to Firestore
    console.log(`Saving metadata for document: ${documentId} to collection: ${COLLECTIONS.DOCUMENTS}`);
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, validDocId);
    await setDoc(docRef, metadata);
    
    // Save chunks to Firestore
    console.log(`Saving ${processResult.chunks.length} chunks for document: ${documentId} to collection: ${COLLECTIONS.CHUNKS}`);
    const chunksCollection = collection(db, COLLECTIONS.CHUNKS);
    
    // Process chunks in batches to avoid Firestore write limits
    const batchSize = 100;
    for (let i = 0; i < processResult.chunks.length; i += batchSize) {
      const batchChunks = processResult.chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(processResult.chunks.length/batchSize)}`);
      
      // Process each chunk in the batch
      const batchPromises = batchChunks.map(async (chunk) => {
        try {
          // Add chunk to Firestore with a sanitized document ID reference
          await addDoc(chunksCollection, {
            ...chunk,
            documentId: validDocId, // Use the sanitized document ID
            createdAt: serverTimestamp()
          });
        } catch (chunkError) {
          console.error(`Error saving chunk ${chunk.id}:`, chunkError);
          // Continue with next chunk
        }
      });
      
      // Wait for all chunks in this batch to be processed
      await Promise.all(batchPromises);
    }
    
    console.log(`Successfully processed document: ${fileName}`);
    
    return {
      success: true,
      metadata,
      chunks: processResult.chunks
    };
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error);
    
    // Try to update document status to error
    try {
      const db = getFirestore();
      // Create a valid Firestore document ID by removing invalid characters
      const validDocId = documentId.replace(/[\/\.\#\$\[\]]/g, '_');
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, validDocId);
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(docRef, {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new document with error status
        await setDoc(docRef, {
          id: documentId,
          fileName,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (statusError) {
      console.error(`Failed to update error status for document ${documentId}:`, statusError);
    }
    
    return {
      success: false,
      metadata: {},
      chunks: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process a single PDF file
 * @param fileBuffer PDF file buffer
 * @param fileName File name
 * @returns Processing result with document ID and chunk IDs
 */
export const processPdf = async (
  fileBuffer: Buffer | Uint8Array | ArrayBuffer,
  fileName: string
): Promise<{
  success: boolean;
  documentId?: string;
  chunkIds?: string[];
  error?: string;
  textLength?: number;
  chunkCount?: number;
}> => {
  try {
    console.log(`[processPdf] Processing PDF: ${fileName}, buffer size: ${
      fileBuffer instanceof ArrayBuffer 
        ? fileBuffer.byteLength 
        : 'byteLength' in fileBuffer 
          ? fileBuffer.byteLength 
          : (fileBuffer as Buffer).length
    } bytes`);
    
    // Create a valid document ID from the filename
    const documentId = fileName.replace(/\.[^/.]+$/, '').replace(/[\/\.\#\$\[\]]/g, '_');
    console.log(`[processPdf] Document ID: ${documentId}`);
    
    // Extract text from PDF
    console.log(`[processPdf] Extracting text from PDF: ${fileName}`);
    console.log(`[processPdf] Environment: ${isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js'}`);
    
    const startTime = Date.now();
    const extractedDoc = await extractTextFromDocument(fileBuffer, fileName);
    const extractionTime = Date.now() - startTime;
    
    console.log(`[processPdf] Text extraction completed in ${extractionTime}ms`);
    console.log(`[processPdf] Extracted ${extractedDoc.text.length} characters, ${extractedDoc.pageCount} pages`);
    
    // Validate extracted text
    if (!extractedDoc.text || extractedDoc.text.trim().length < 50) {
      // Special handling for React Native with limited text
      if (isReactNative && extractedDoc.text.includes('[PDF Document:')) {
        console.log('[processPdf] Limited text extraction on mobile, proceeding with available content');
        
        // Store basic document metadata
        await storeDocumentMetadata({
          title: fileName,
          description: `PDF document with ${extractedDoc.pageCount} pages. Processed on mobile device with limited text extraction.`,
          fileName,
          fileUrl: '',
          fileSize: fileBuffer instanceof ArrayBuffer 
            ? fileBuffer.byteLength 
            : 'byteLength' in fileBuffer 
              ? fileBuffer.byteLength 
              : (fileBuffer as Buffer).length
        });
        
        // Create a single chunk with the limited information
        const embedding = await createEmbedding(extractedDoc.text);
        const chunkId = await storeDocumentChunk({
          documentId,
          documentTitle: fileName,
          pageNumber: 1,
          content: extractedDoc.text,
          embedding,
          chunkIndex: 0
        });
        
        return {
          success: true,
          documentId,
          chunkIds: [chunkId],
          textLength: extractedDoc.text.length,
          chunkCount: 1
        };
      } else {
        // For non-mobile or when no text at all was extracted
        throw new Error(`Insufficient text extracted from PDF: ${extractedDoc.text.length} characters`);
      }
    }
    
    // Split text into chunks
    console.log(`[processPdf] Splitting text into chunks`);
    const chunks = splitIntoChunks(extractedDoc.text);
    console.log(`[processPdf] Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      throw new Error('Failed to create chunks from extracted text');
    }
    
    // Store document metadata
    console.log(`[processPdf] Storing document metadata in collection: ${COLLECTIONS.DOCUMENTS}`);
    await storeDocumentMetadata({
      title: fileName,
      description: `PDF document with ${extractedDoc.pageCount} pages and ${extractedDoc.text.length} characters.`,
      fileName,
      fileUrl: '',
      fileSize: fileBuffer instanceof ArrayBuffer 
        ? fileBuffer.byteLength 
        : 'byteLength' in fileBuffer 
          ? fileBuffer.byteLength 
          : (fileBuffer as Buffer).length
    });
    
    // Process and store each chunk
    console.log(`[processPdf] Processing ${chunks.length} chunks and storing in collection: ${COLLECTIONS.CHUNKS}`);
    const chunkIds: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding for chunk
      const embedding = await createEmbedding(chunk.text);
      
      // Store chunk in Firestore
      const chunkId = await storeDocumentChunk({
        documentId,
        documentTitle: fileName,
        pageNumber: chunk.pageNumber,
        content: chunk.text,
        embedding,
        chunkIndex: i
      });
      
      chunkIds.push(chunkId);
    }
    
    console.log(`[processPdf] Successfully processed PDF with ${chunkIds.length} chunks`);
    
    return {
      success: true,
      documentId,
      chunkIds,
      textLength: extractedDoc.text.length,
      chunkCount: chunks.length
    };
  } catch (error) {
    console.error(`[processPdf] Error processing PDF:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Get available PDF documents (pre-loaded by admin)
 * @returns Array of document metadata
 */
export const getAvailablePdfDocuments = async (): Promise<Array<{
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  pageCount: number;
  fileType: 'pdf' | 'doc' | string;
}>> => {
  try {
    const db = getFirestore();
    const documentsRef = collection(db, COLLECTIONS.DOCUMENTS);
    const querySnapshot = await getDocs(documentsRef);
    
    const documents: Array<{
      id: string;
      title: string;
      description: string;
      fileUrl: string;
      pageCount: number;
      fileType: 'pdf' | 'doc' | string;
    }> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        title: data.title || 'Untitled Document',
        description: data.description || 'No description available',
        fileUrl: data.fileUrl || '',
        pageCount: data.pageCount || 0,
        fileType: 'pdf' // Default to PDF since we're processing PDFs
      });
    });
    
    return documents;
  } catch (error: any) {
    console.error('Error getting available PDF documents:', error);
    return [];
  }
};

/**
 * Get a specific PDF document by ID
 * @param documentId Document ID
 * @returns Document data or null if not found
 */
export const getPdfDocument = async (documentId: string): Promise<DocumentData | null> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      console.log(`Document ${documentId} not found`);
      return null;
    }
  } catch (error: any) {
    console.error('Error getting PDF document:', error);
    return null;
  }
};

/**
 * Search for content in PDF documents using vector search
 * @param queryText Text to search for
 * @param documentId Optional document ID to limit search to a specific document
 * @param maxResults Maximum number of results to return
 * @returns Array of search results with similarity scores
 */
export const searchPdfContent = async (
  queryText: string,
  documentId?: string,
  maxResults: number = 10
): Promise<Array<{
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  pageNumber: number;
  similarity: number;
}>> => {
  try {
    if (!queryText.trim()) {
      return [];
    }
    
    console.log(`Searching for: "${queryText}"`);
    
    // Generate embedding for query
    const queryEmbedding = await createEmbedding(queryText);
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);
    
    // Get all chunks from Firestore
    const db = getFirestore();
    const chunksRef = collection(db, COLLECTIONS.CHUNKS);
    
    // If documentId is provided, limit search to that document
    let q = query(chunksRef);
    if (documentId) {
      q = query(chunksRef, where('documentId', '==', documentId));
    }
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.docs.length} chunks in Firestore`);
    
    // Calculate similarity scores
    const results = [];
    let processedChunks = 0;
    let validEmbeddingChunks = 0;
    let relevantChunks = 0;
    
    for (const chunkDoc of querySnapshot.docs) {
      processedChunks++;
      const chunkData = chunkDoc.data();
      const embedding = chunkData.embedding;
      
      if (!embedding || !Array.isArray(embedding)) {
        continue;
      }
      
      validEmbeddingChunks++;
      
      // Calculate similarity using cosine similarity
      const similarity = calculateSimilarity(queryEmbedding, embedding);
      
      // Verify relevance
      if (similarity > 0.4) {
        relevantChunks++;
        results.push({
          id: chunkDoc.id,
          documentId: chunkData.documentId,
          documentTitle: chunkData.documentTitle,
          content: chunkData.content,
          pageNumber: chunkData.pageNumber || 1,
          similarity
        });
      }
    }
    
    console.log(`Processed ${processedChunks} chunks, ${validEmbeddingChunks} had valid embeddings, ${relevantChunks} were relevant`);
    
    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, maxResults);
    console.log(`Returning top ${limitedResults.length} results with similarity scores: ${limitedResults.map(r => r.similarity.toFixed(2)).join(', ')}`);
    
    return limitedResults;
  } catch (error: any) {
    console.error('Error searching PDF content:', error);
    return [];
  }
};

/**
 * Generate a chat response based on PDF content
 * @param userQuery User's question
 * @param sessionId Optional chat session ID to include conversation history
 * @param conversationHistory Optional conversation history to include context
 * @returns Generated response with source references
 */
export const generatePdfChatResponse = async (
  sessionId: string,
  userQuery: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> => {
  try {
    console.log(`Generating chat response for session ${sessionId}`);
    
    // Get document ID from session
    const sessionRef = doc(db, COLLECTIONS.CHATS, sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      throw new Error(`Chat session ${sessionId} not found`);
    }
    
    const documentId = sessionDoc.data().documentId;
    
    if (!documentId) {
      throw new Error(`No document associated with chat session ${sessionId}`);
    }
    
    // Search for relevant content
    const searchResults = await searchPdfContent(userQuery, documentId);
    
    if (searchResults.length === 0) {
      return "I couldn't find any relevant information in the document to answer your question. Could you please rephrase or ask something else?";
    }
    
    // Filter results to only include relevant content
    const filteredResults = await Promise.all(
      searchResults.map(async (result) => {
        const isRelevant = await verifyDocumentRelevance(userQuery, result.content, result.similarity);
        return { ...result, isRelevant };
      })
    );
    
    // Only use results that are deemed relevant
    const relevantResults = filteredResults.filter(result => result.isRelevant);
    
    if (relevantResults.length === 0) {
      return "I found some content in the document, but it doesn't seem to be directly relevant to your question. Could you please rephrase or ask something else?";
    }
    
    // Format context from search results
    let contextContent = 'Here is information from the documents:\n\n';
    relevantResults.forEach(result => {
      // Get a proper title for the document
      let title = result.documentTitle;
      if (!title || title === 'undefined' || title === 'null') {
        // Extract title from document ID
        const docIdParts = result.documentId.split('_');
        if (docIdParts.length > 0) {
          title = docIdParts[0]
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        } else {
          title = 'Document';
        }
      }
      
      // Make document reference more prominent
      contextContent += `### [DOCUMENT: ${title} | PAGE: ${result.pageNumber}] ###\n${result.content}\n\n`;
    });
    
    // Create messages for OpenAI
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: `You are a helpful assistant for Safe HMO. Answer the user's question based ONLY on the provided information.

IMPORTANT:
1. Be EXTREMELY concise. Keep responses under 100 words.
2. If you don't know, say "I don't have that information."
3. Cite sources as [Document Title, Page X] when providing information.
4. Never make up information.

Context:
${contextContent}`
    };
    
    const userMessage: ChatCompletionUserMessageParam = {
      role: 'user',
      content: userQuery
    };
    
    // Generate response using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, userMessage] as Array<ChatCompletionMessageParam>,
      temperature: 0.3,
      max_tokens: 150
    });
    
    const responseText = response.choices[0]?.message?.content || 'Sorry, I was unable to generate a response.';
    
    // Save the response
    await saveMessage(sessionId, 'assistant', responseText);
    
    // Log token usage
    const promptTokens = calculateTokens(userQuery);
    const completionTokens = calculateTokens(responseText);
    
    await logTokenUsage({
      userId: 'system',
      promptTokens,
      completionTokens,
      model: 'gpt-3.5-turbo',
      type: 'chat',
      sessionId
    });
    
    return responseText;
  } catch (error) {
    console.error('Error generating PDF chat response:', error);
    return "I'm sorry, I encountered an error while trying to answer your question. Please try again later.";
  }
};

/**
 * Process and upload a PDF document
 * @param filePath URL to the PDF file
 * @param documentTitle Title for the document
 * @param documentDescription Optional description for the document
 * @param createChatSession Whether to automatically create a chat session for this document (default: false)
 * @returns Success status
 */
export const processPdfDocument = async (
  filePath: string,
  documentTitle: string,
  documentDescription: string = "No description provided",
  createChatSession: boolean = false
): Promise<boolean> => {
  try {
    console.log(`Processing PDF document: ${documentTitle}`);
    
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(filePath);
    
    if (!extractedText || extractedText.length === 0) {
      console.log(`No text extracted from ${documentTitle}. Aborting.`);
      return false;
    }
    
    // Split text into chunks
    const chunks = splitIntoChunks(extractedText);
    
    // Store document metadata first to get the document ID
    const documentId = await storeDocumentMetadata({
      title: documentTitle,
      description: documentDescription,
      fileName: documentTitle.replace(/\s+/g, '-').toLowerCase() + '.pdf',
      fileUrl: filePath,
      fileSize: 0 // This would be determined from the actual file in production
    });
    
    // Generate embeddings and store chunks
    const db = getFirestore();
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding for chunk
      const embedding = await createEmbedding(chunk.text);
      
      // Store chunk with embedding
      await storeDocumentChunk({
        documentId,
        documentTitle,
        pageNumber: chunk.pageNumber,
        content: chunk.text,
        embedding,
        chunkIndex: i
      });
      
      console.log(`Processed chunk ${i + 1}/${chunks.length}`);
    }
    
    // Update document as processed
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
    await updateDoc(docRef, {
      processed: true,
      processedAt: serverTimestamp(),
      chunkCount: chunks.length
    });
    
    // Only create a chat session if explicitly requested
    if (createChatSession) {
      console.log(`Creating chat session for document: ${documentId}`);
      await createPdfChatSession('admin');
    } else {
      console.log(`Skipping chat session creation for document: ${documentId}`);
    }
    
    console.log(`Completed processing document: ${documentTitle}`);
    return true;
  } catch (error: any) {
    console.error('Error processing PDF document:', error);
    return false;
  }
};

/**
 * Create a new PDF chat session
 * @param userId User ID
 * @returns Chat session ID
 */
export const createPdfChatSession = async (userId: string): Promise<string> => {
  try {
    console.log(`[createPdfChatSession] Creating new chat session for user: ${userId}`);
    
    const db = getFirestore();
    
    // Create a new chat session
    const sessionData = {
      userId,
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      messageCount: 0,
      chatId: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` // Generate a unique chatId
    };
    
    console.log(`[createPdfChatSession] Storing chat session in collection: ${COLLECTIONS.CHATS}`);
    const sessionRef = await addDoc(collection(db, COLLECTIONS.CHATS), sessionData);
    console.log(`[createPdfChatSession] Created chat session with ID: ${sessionRef.id}`);
    
    return sessionRef.id;
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

/**
 * Get existing chat session for a user
 * @param userId User ID
 * @returns Chat session ID or null if none exists
 */
export const getExistingChatSession = async (userId: string): Promise<string | null> => {
  try {
    console.log(`[getExistingChatSession] Checking for existing chat session for user: ${userId}`);
    
    const db = getFirestore();
    
    // Check if the user already has an active chat session
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('lastUpdatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    // If an existing session is found, return its ID
    if (!querySnapshot.empty) {
      const existingSession = querySnapshot.docs[0];
      console.log(`[getExistingChatSession] Found existing chat session with ID: ${existingSession.id}`);
      
      // Update the lastUpdatedAt timestamp to keep it fresh
      await updateDoc(doc(db, COLLECTIONS.CHATS, existingSession.id), {
        lastUpdatedAt: serverTimestamp()
      });
      
      return existingSession.id;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error retrieving chat session:', error);
    throw error;
  }
};

/**
 * Generate a chat response using content from all available documents
 * @param userId User ID
 * @param sessionId Chat session ID
 * @param userQuery User's question
 * @returns Generated response text
 */
export const generateChatResponseFromAllDocs = async (
  userId: string,
  sessionId: string,
  userQuery: string
): Promise<string> => {
  try {
    console.log(`Generating chat response for query: "${userQuery.substring(0, 50)}..."`);
    
    // Get conversation history
    const chatHistory = await getChatMessages(sessionId);
    
    // Create conversation history in the format OpenAI expects
    const messages: ChatCompletionMessageParam[] = [];
    
    // System message to set the context and behavior
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: `You are a helpful assistant for Safe HMO, a company that specializes in HMO (House in Multiple Occupation) properties. 
      Your goal is to provide accurate information about HMO regulations, compliance, and property management.
      Answer questions based on the provided context and your knowledge of UK housing regulations.
      Be concise and helpful. If you don't know the answer, say so honestly and suggest contacting Safe HMO directly.
      Do not include citations or references in your responses.`
    };
    
    messages.push(systemMessage);
    
    // Add conversation history
    for (const message of chatHistory) {
      if (message.isUserMessage) {
        messages.push({
          role: 'user',
          content: message.content
        });
      } else {
        messages.push({
          role: 'assistant',
          content: message.content
        });
      }
    }
    
    // Add the current user query
    messages.push({
      role: 'user',
      content: userQuery
    });
    
    // Search for relevant content in documents
    const searchResults = await searchPdfContent(userQuery, undefined, 5);
    
    // If we have relevant content, include it in the prompt
    if (searchResults.length > 0) {
      // Extract the content from search results
      const contextContent = searchResults
        .map(result => `Content from "${result.documentTitle}": ${result.content}`)
        .join('\n\n');
      
      // Add context message
      messages.splice(1, 0, {
        role: 'user',
        content: `Here is some context that might help you answer my questions:\n\n${contextContent}\n\nPlease use this information to help answer my questions, but do not reference the sources directly in your answers.`
      });
      
      // Add assistant acknowledgment
      messages.splice(2, 0, {
        role: 'assistant',
        content: "I will use this context to help answer your questions."
      });
    }
    
    // Configure the OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || OPENAI_CONFIG.API_KEY,
      dangerouslyAllowBrowser: true // Allow usage in browser environments
    });
    
    // Generate a response using the OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // Extract the response text
    const responseText = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response at this time.';
    
    // Log token usage
    if (completion.usage) {
      await logTokenUsage({
        userId,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        model: completion.model,
        type: 'chat',
        sessionId
      });
    }
    
    return responseText;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
};

/**
 * Get user's chat sessions
 * @param userId User ID
 * @returns Array of chat sessions
 */
export const getUserChatSessions = async (userId: string): Promise<any[]> => {
  try {
    const db = getFirestore();
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('lastUpdatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const sessions: any[] = [];
    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return sessions;
  } catch (error: any) {
    console.error('Error getting user chat sessions:', error);
    return [];
  }
};

/**
 * Estimate token count for a string
 * This is a simple estimation - in production, use a proper tokenizer
 * @param text Text to estimate token count for
 * @returns Estimated token count
 */
export const estimateTokenCount = (text: string): number => {
  // A very rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
};

/**
 * Log token usage to Firestore
 * @param params Token usage parameters
 */
export const logTokenUsage = async ({
  userId,
  promptTokens,
  completionTokens,
  model,
  type = 'chat',
  sessionId
}: {
  userId: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  type?: string;
  sessionId?: string;
}): Promise<void> => {
  try {
    const totalTokens = promptTokens + completionTokens;
    console.log(`Logging token usage: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`);
    
    const tokenUsageRef = collection(db, 'token_usage');
    await addDoc(tokenUsageRef, {
      userId,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      type,
      sessionId,
      timestamp: serverTimestamp()
    });
    
    console.log('Token usage logged successfully');
  } catch (error) {
    console.error('Error logging token usage:', error);
  }
};

/**
 * Get the total token usage for a user
 * @param userId User ID
 * @returns Total token usage
 */
export const getUserTokenUsage = async (userId: string): Promise<number> => {
  try {
    const tokenUsageRef = collection(db, 'token_usage');
    const q = query(
      tokenUsageRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    let totalTokens = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalTokens += data.totalTokens || 0;
    });
    
    console.log(`Total token usage for user ${userId}: ${totalTokens}`);
    return totalTokens;
  } catch (error) {
    console.error('Error getting user token usage:', error);
    return 0;
  }
};

/**
 * Get chat messages for a session
 * @param sessionId Chat session ID
 * @returns Array of messages
 */
export const getChatMessages = async (sessionId: string): Promise<any[]> => {
  try {
    const db = getFirestore();
    const messagesRef = collection(db, COLLECTIONS.MESSAGES);
    
    // First try with timestamp ordering
    try {
      const q = query(
        messagesRef,
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const messages: any[] = [];
      const seenMessageIds = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip if we've already seen this message ID
        if (seenMessageIds.has(doc.id)) {
          return;
        }
        
        seenMessageIds.add(doc.id);
        
        // Convert Firestore timestamp to JavaScript Date if it exists
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          data.timestamp = data.timestamp.toDate();
        }
        
        // Ensure isUserMessage is correctly set based on role
        if (data.role === 'user') {
          data.isUserMessage = true;
        } else if (data.role === 'assistant') {
          data.isUserMessage = false;
        }
        
        // Make sure content is a string
        if (!data.content) {
          data.content = '';
        }
        
        messages.push({
          id: doc.id,
          ...data
        });
      });
      
      return messages;
    } catch (orderError) {
      console.warn('Error with ordered query, falling back to unordered:', orderError);
      
      // Fallback to just getting messages without ordering
      const basicQuery = query(
        messagesRef,
        where('sessionId', '==', sessionId)
      );
      
      const basicSnapshot = await getDocs(basicQuery);
      
      const messages: any[] = [];
      basicSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Ensure isUserMessage is correctly set based on role
        if (data.role === 'user') {
          data.isUserMessage = true;
        } else if (data.role === 'assistant') {
          data.isUserMessage = false;
        }
        
        // Make sure content is a string
        if (!data.content) {
          data.content = '';
        }
        
        messages.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort manually by timestamp if possible
      return messages.sort((a, b) => {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        if (a.timestamp.seconds && b.timestamp.seconds) {
          return a.timestamp.seconds - b.timestamp.seconds;
        }
        return 0;
      });
    }
  } catch (error: any) {
    console.error('Error getting chat messages:', error);
    return [];
  }
};

/**
 * Save a message to chat history
 * @param sessionId Chat session ID
 * @param content Message content
 * @param isUserMessage Whether the message is from the user
 * @param sources Optional source references
 * @returns Saved message data
 */
export const saveChatMessage = async (
  sessionId: string,
  content: string,
  isUserMessage: boolean,
  sources: any[] = []
): Promise<any> => {
  try {
    return await saveMessage(
      sessionId, 
      isUserMessage ? 'user' : 'assistant', 
      content, 
      sources
    );
  } catch (error: any) {
    console.error('Error saving chat message:', error);
    throw error;
  }
};

/**
 * Save a message to the chat history
 * @param sessionId Chat session ID
 * @param role Role of the message sender ('user' or 'assistant')
 * @param content Message content
 * @param sources Optional source references
 * @returns Saved message data
 */
export const saveMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sources: any[] = []
): Promise<any> => {
  try {
    const db = getFirestore();
    
    // Filter out any undefined values from sources and ensure it's a valid array
    const sanitizedSources = Array.isArray(sources) 
      ? sources
          .filter(source => source !== undefined && source !== null)
          .map(source => ({
            documentId: source.documentId || '',
            title: source.title || 'Unknown Document',
            pageNumber: source.pageNumber || 1
          }))
      : [];
    
    // Remove duplicate sources by creating a unique key for each source
    const uniqueSources = sanitizedSources.reduce((acc: any[], source: any) => {
      // Ensure source has all required fields
      if (!source.documentId) {
        return acc;
      }
      
      // Create a unique key for this source
      const key = `${source.documentId}-${source.pageNumber || 0}`;
      
      // Check if we already have this source
      const exists = acc.some(item => 
        `${item.documentId}-${item.pageNumber || 0}` === key
      );
      
      if (!exists) {
        // Ensure source has a title
        if (!source.title) {
          // Try to get the document title
          try {
            const docRef = doc(db, COLLECTIONS.PDF_DOCUMENTS, source.documentId);
            const docSnap = getDoc(docRef);
            docSnap.then(snapshot => {
              if (snapshot.exists()) {
                source.title = snapshot.data().title || 'Untitled Document';
              } else {
                source.title = 'Unknown Document';
              }
            }).catch(() => {
              source.title = 'Unknown Document';
            });
          } catch {
            source.title = 'Unknown Document';
          }
        }
        
        acc.push(source);
      }
      
      return acc;
    }, []);
    
    // Limit to top 3 most relevant sources to avoid overwhelming the user
    const limitedSources = uniqueSources.slice(0, 3);
    
    // Create message data object with null checks to prevent undefined values
    const messageData: {
      sessionId: string;
      content: string;
      role: 'user' | 'assistant';
      timestamp: any; // Using any for serverTimestamp
      sources: any[];
      isUser: boolean;
      userId: string;
      [key: string]: any; // Add index signature to allow string indexing
    } = {
      sessionId: sessionId || '',
      content: content || '',
      role: role || 'assistant',
      timestamp: serverTimestamp(),
      sources: limitedSources || [],
      isUser: role === 'user',
      userId: 'system'  // Add userId to ensure proper permissions
    };
    
    // Remove any undefined or null values from the object
    Object.keys(messageData).forEach(key => {
      if (messageData[key] === undefined || messageData[key] === null) {
        if (key === 'sources') {
          messageData[key] = [];
        } else if (key === 'isUser') {
          messageData[key] = false;
        } else if (key === 'timestamp') {
          // Keep serverTimestamp as is
        } else {
          messageData[key] = '';
        }
      }
    });
    
    const messageRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), messageData);
    
    // Update session's lastUpdatedAt and messageCount
    const sessionRef = doc(db, COLLECTIONS.CHATS, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (sessionSnap.exists()) {
      const sessionData = sessionSnap.data();
      await updateDoc(sessionRef, {
        lastUpdatedAt: serverTimestamp(),
        messageCount: (sessionData.messageCount || 0) + 1
      });
    }
    
    return {
      id: messageRef.id,
      ...messageData
    };
  } catch (error: any) {
    console.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Get chat history for a session
 * @param sessionId Chat session ID
 * @returns Array of messages
 */
export const getChatHistory = async (sessionId: string): Promise<any[]> => {
  try {
    return await getChatMessages(sessionId);
  } catch (error: any) {
    console.error('Error getting chat history:', error);
    return [];
  }
};
