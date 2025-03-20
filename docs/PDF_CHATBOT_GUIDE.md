# PDF Chatbot Implementation Guide

## Overview

The Safe HMO app includes a PDF chatbot feature that allows users to interact with pre-loaded PDF documents. This document explains how the system works and how to add your own PDF documents.

## How It Works

1. **Pre-loaded Documents**: Instead of allowing user uploads, the app uses a set of pre-selected PDF documents stored in Firebase.
2. **Vector Search**: Documents are processed into chunks, and vector embeddings are generated for each chunk to enable semantic search.
3. **AI-Powered Responses**: When a user asks a question, the system:
   - Retrieves the most relevant document chunks using vector search
   - Uses Gemini AI to generate a response based on the retrieved content
   - Provides source citations to show where the information came from

## Key Components

### 1. Firebase Configuration (`config.ts`)

The configuration file defines the Firestore collections and vector search settings:

```typescript
// PDF document collections
export const COLLECTIONS = {
  PDF_DOCUMENTS: 'pdf_documents',
  PDF_CHUNKS: 'pdf_chunks',
  CHAT_SESSIONS: 'chat_sessions',
  MESSAGES: 'messages'
};

// Vector search configuration
export const VECTOR_CONFIG = {
  DIMENSIONS: 768,
  DISTANCE_MEASURE: 'COSINE',
  INDEX_NAME: 'pdf-content-index'
};

// Gemini AI configuration
export const GEMINI_CONFIG = {
  MODEL: 'gemini-pro',
  MAX_OUTPUT_TOKENS: 1024,
  TEMPERATURE: 0.2,
  TOP_K: 40,
  TOP_P: 0.95
};
```

### 2. PDF Service (`pdfService.ts`)

This service handles all PDF-related functionality:

- Retrieving available PDF documents
- Creating chat sessions for specific documents
- Querying PDF content using vector search
- Generating chat responses using AI

### 3. Chat Interface (`chat.tsx`)

The chat interface allows users to:
- Select from available PDF documents
- Ask questions about the selected document
- View AI-generated responses with source citations

## Adding Your Own PDFs

### Option 1: Using the Upload Script

1. Create a `pdfs` folder in the project root
2. Place your PDF files in this folder
3. Install required dependencies:
   ```bash
   npm install firebase-admin pdf-parse
   ```
4. Create a service account key:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the project root
5. Update the storage bucket in `scripts/uploadPdfs.js`
6. Run the script:
   ```bash
   node scripts/uploadPdfs.js
   ```

### Option 2: Manual Firebase Setup

1. Upload PDFs to Firebase Storage
2. Create document records in the `pdf_documents` collection with:
   - `title`: Document title
   - `description`: Brief description
   - `pageCount`: Number of pages
   - `fileUrl`: Download URL from Firebase Storage
3. Process the PDF text into chunks
4. Generate embeddings for each chunk
5. Store chunks in the `pdf_chunks` collection with:
   - `documentId`: Reference to the parent document
   - `content`: Text content of the chunk
   - `embedding`: Vector embedding of the content
   - `pageNumber`: Page number
   - `title`: Section title

## Vector Search Implementation

The app uses Firebase's vector search capabilities to find relevant document chunks based on user queries:

1. The user's question is converted to a vector embedding
2. This embedding is compared to the embeddings of all document chunks
3. The most similar chunks are retrieved based on cosine similarity
4. These chunks provide the context for generating the AI response

## Security Considerations

- Ensure proper Firebase security rules are in place to protect document data
- Only authenticated users should be able to access the PDF documents
- Consider implementing rate limiting for AI requests to control costs

## Troubleshooting

### Common Issues

1. **Vector Search Not Working**:
   - Verify that embeddings are properly generated and stored
   - Check that the vector dimensions match between queries and stored embeddings
   - Ensure Firebase vector search is properly configured

2. **AI Responses Not Relevant**:
   - Adjust the number of chunks retrieved for context
   - Try different embedding models for better semantic understanding
   - Modify the prompt template to improve response quality

3. **Performance Issues**:
   - Optimize chunk size for better search results
   - Implement caching for frequently accessed documents
   - Consider using a more efficient embedding model

## Future Enhancements

1. **Document Categories**: Group documents by category for easier navigation
2. **Highlighted Citations**: Show exactly where in the document the information was found
3. **Document Comparison**: Allow comparing information across multiple documents
4. **Custom Instructions**: Let users customize how the AI interprets documents
