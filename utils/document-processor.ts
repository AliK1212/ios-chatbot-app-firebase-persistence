// Import Buffer polyfill for browser environments
import './buffer-polyfill';

import { Timestamp } from 'firebase/firestore';
import { extractTextFromDocument } from './text-extractor';
import { splitTextIntoChunks } from './chunking-service';
import { generateEmbedding } from './embedding-service';

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  pageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'processed' | 'processing' | 'error';
  error?: string;
  size: number;
}

/**
 * Document chunk interface
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  index: number;
  createdAt: Timestamp;
}

/**
 * Process a document buffer and store its chunks with embeddings
 */
export async function processDocument(
  buffer: Buffer | ArrayBuffer | Uint8Array, 
  fileName: string, 
  documentId: string
): Promise<{ metadata: any; chunks: any[] }> {
  try {
    console.log(`[document-processor] Processing document: ${fileName}, ID: ${documentId}`);
    
    // Ensure buffer is in the right format
    let processBuffer: Buffer | Uint8Array;
    if (buffer instanceof ArrayBuffer) {
      processBuffer = new Uint8Array(buffer);
    } else {
      processBuffer = buffer;
    }
    
    // Extract text from document
    const { text, pageCount, fileType } = await extractTextFromDocument(processBuffer, fileName);
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from document');
    }
    
    console.log(`[document-processor] Extracted ${text.length} characters from ${pageCount} pages`);
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    console.log(`[document-processor] Split text into ${chunks.length} chunks`);
    
    // Create document metadata
    const now = Timestamp.now();
    const metadata = {
      id: documentId,
      fileName,
      fileType,
      pageCount,
      createdAt: now,
      updatedAt: now,
      status: 'processing',
      size: buffer instanceof ArrayBuffer ? buffer.byteLength : buffer.length,
    };
    
    // Process each chunk and generate embeddings
    const documentChunks = [];
    
    console.log(`[document-processor] Generating embeddings for ${chunks.length} chunks`);
    
    // Process chunks in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      
      // Process each chunk in the batch
      const batchPromises = batchChunks.map(async (chunkText, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        try {
          // Generate embedding for chunk
          const embedding = await generateEmbedding(chunkText);
          
          // Create chunk object
          const chunk = {
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            text: chunkText,
            embedding,
            index: chunkIndex,
            createdAt: now,
          };
          
          return chunk;
        } catch (chunkError) {
          console.error(`[document-processor] Error processing chunk ${chunkIndex}:`, chunkError);
          
          // Return a chunk with an empty embedding as fallback
          return {
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            text: chunkText,
            embedding: [], // Empty embedding as fallback
            index: chunkIndex,
            createdAt: now,
          };
        }
      });
      
      // Wait for all chunks in this batch to be processed
      const processedChunks = await Promise.all(batchPromises);
      documentChunks.push(...processedChunks);
      
      console.log(`[document-processor] Processed chunks ${i} to ${Math.min(i + batchSize - 1, chunks.length - 1)}`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Update metadata status
    metadata.status = 'processed';
    
    console.log(`[document-processor] Document processing complete. Generated ${documentChunks.length} chunks with embeddings`);
    
    return {
      metadata,
      chunks: documentChunks,
    };
  } catch (error) {
    console.error('[document-processor] Error processing document:', error);
    
    // Create error metadata
    const errorMetadata: DocumentMetadata = {
      id: documentId,
      fileName,
      fileType: 'unknown',
      pageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      size: buffer instanceof ArrayBuffer 
        ? buffer.byteLength 
        : 'byteLength' in buffer 
          ? (buffer as Uint8Array).byteLength 
          : (buffer as Buffer).length,
    };
    
    return {
      metadata: errorMetadata,
      chunks: [],
    };
  }
}

/**
 * Process a document from its buffer or array buffer and store its chunks with embeddings
 * @param bufferOrArrayBuffer Document buffer or array buffer
 * @param fileName Document filename
 * @param documentId Document ID
 * @returns Document metadata and chunks
 */
export async function processDocumentCompat(
  bufferOrArrayBuffer: Buffer | ArrayBuffer | Uint8Array, 
  fileName: string, 
  documentId: string
): Promise<{ metadata: DocumentMetadata; chunks: DocumentChunk[] }> {
  try {
    console.log(`[document-processor] Processing document: ${fileName}, ID: ${documentId}`);
    
    // Convert ArrayBuffer to Buffer if needed
    const buffer = bufferOrArrayBuffer instanceof ArrayBuffer 
      ? new Uint8Array(bufferOrArrayBuffer) 
      : bufferOrArrayBuffer;
    
    // Extract text from document
    console.log(`[document-processor] Extracting text from document: ${fileName}`);
    let textExtractionResult;
    try {
      textExtractionResult = await extractTextFromDocument(buffer, fileName);
      console.log(`[document-processor] Text extraction successful for ${fileName}`);
    } catch (extractionError: unknown) {
      console.error(`[document-processor] Text extraction failed for ${fileName}:`, extractionError);
      throw new Error(`Text extraction failed: ${extractionError instanceof Error ? extractionError.message : String(extractionError)}`);
    }
    
    const { text, pageCount, fileType } = textExtractionResult;
    
    if (!text || text.trim().length === 0) {
      console.error(`[document-processor] No text extracted from document ${fileName}`);
      throw new Error('No text extracted from document');
    }
    
    console.log(`[document-processor] Extracted ${text.length} characters from ${pageCount} pages`);
    
    // Split text into chunks
    console.log(`[document-processor] Splitting text into chunks for ${fileName}`);
    let chunks;
    try {
      chunks = splitTextIntoChunks(text);
      console.log(`[document-processor] Successfully split text into ${chunks.length} chunks`);
    } catch (chunkingError: unknown) {
      console.error(`[document-processor] Error splitting text into chunks for ${fileName}:`, chunkingError);
      throw new Error(`Error splitting text into chunks: ${chunkingError instanceof Error ? chunkingError.message : String(chunkingError)}`);
    }
    
    // Create document metadata
    const now = Timestamp.now();
    const metadata: DocumentMetadata = {
      id: documentId,
      fileName,
      fileType,
      pageCount,
      createdAt: now,
      updatedAt: now,
      status: 'processing',
      size: bufferOrArrayBuffer instanceof ArrayBuffer 
        ? bufferOrArrayBuffer.byteLength 
        : 'byteLength' in bufferOrArrayBuffer 
          ? (bufferOrArrayBuffer as Uint8Array).byteLength 
          : (bufferOrArrayBuffer as Buffer).length,
    };
    
    // Process each chunk and generate embeddings
    const documentChunks: DocumentChunk[] = [];
    
    console.log(`[document-processor] Generating embeddings for ${chunks.length} chunks`);
    
    // Process chunks in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      console.log(`[document-processor] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} for ${fileName}`);
      
      // Process each chunk in the batch
      const batchPromises = batchChunks.map(async (chunkText, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        try {
          // Generate embedding for chunk
          console.log(`[document-processor] Generating embedding for chunk ${chunkIndex} of ${fileName}`);
          const embedding = await generateEmbedding(chunkText);
          console.log(`[document-processor] Successfully generated embedding for chunk ${chunkIndex} of ${fileName}`);
          
          // Create chunk object
          const chunk: DocumentChunk = {
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            text: chunkText,
            embedding,
            index: chunkIndex,
            createdAt: now,
          };
          
          return chunk;
        } catch (chunkError) {
          console.error(`[document-processor] Error processing chunk ${chunkIndex} of ${fileName}:`, chunkError);
          
          // Return a chunk with an empty embedding as fallback
          return {
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            text: chunkText,
            embedding: [], // Empty embedding as fallback
            index: chunkIndex,
            createdAt: now,
          };
        }
      });
      
      // Wait for all chunks in this batch to be processed
      const processedChunks = await Promise.all(batchPromises);
      documentChunks.push(...processedChunks);
      
      console.log(`[document-processor] Processed chunks ${i} to ${Math.min(i + batchSize - 1, chunks.length - 1)}`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Update metadata status
    metadata.status = 'processed';
    
    console.log(`[document-processor] Document processing complete. Generated ${documentChunks.length} chunks with embeddings`);
    
    return {
      metadata,
      chunks: documentChunks,
    };
  } catch (error) {
    console.error('[document-processor] Error processing document:', error);
    
    // Create error metadata
    const errorMetadata: DocumentMetadata = {
      id: documentId,
      fileName,
      fileType: 'unknown',
      pageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      size: bufferOrArrayBuffer instanceof ArrayBuffer 
        ? bufferOrArrayBuffer.byteLength 
        : 'byteLength' in bufferOrArrayBuffer 
          ? (bufferOrArrayBuffer as Uint8Array).byteLength 
          : (bufferOrArrayBuffer as Buffer).length,
    };
    
    return {
      metadata: errorMetadata,
      chunks: [],
    };
  }
}

/**
 * Get document metadata by ID
 */
export async function getDocumentMetadata(documentId: string): Promise<any | null> {
  try {
    // This is a placeholder function that would normally interact with Firestore
    // In a React Native environment, you would implement this using Firebase SDK
    console.log(`[document-processor] Getting document metadata for ID: ${documentId}`);
    return null;
  } catch (error) {
    console.error('[document-processor] Error getting document metadata:', error);
    return null;
  }
}

/**
 * Get document chunks by document ID
 */
export async function getDocumentChunks(documentId: string): Promise<any[]> {
  try {
    // This is a placeholder function that would normally interact with Firestore
    // In a React Native environment, you would implement this using Firebase SDK
    console.log(`[document-processor] Getting document chunks for ID: ${documentId}`);
    return [];
  } catch (error) {
    console.error('[document-processor] Error getting document chunks:', error);
    return [];
  }
}
