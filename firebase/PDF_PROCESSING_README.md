# PDF Processing Implementation Guide

This document provides instructions for setting up and implementing the PDF processing functionality in the SafeHMO app.

## Overview

The PDF processing system allows the app to:
1. Access PDF documents stored in Firebase Storage
2. Extract text content from these PDFs
3. Generate embeddings for the text content
4. Store the text and embeddings in Firestore for vector search
5. Enable the chatbot to answer questions based on the PDF content

## Prerequisites

- Firebase project with Storage and Firestore enabled
- OpenAI API key for generating embeddings
- Admin access to the SafeHMO app

## Firebase Storage Setup

1. Create a folder in Firebase Storage named `pdf_documents`
2. Upload your PDF files to this folder
3. Ensure the Firebase Storage rules allow authenticated users to read from this folder
4. Ensure admin users have write access to this folder

## Firebase Storage Rules

The following rules should be applied in your Firebase Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read all files
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // Allow all authenticated users to list and read PDF documents
    match /pdf_documents/{document=**} {
      allow read: if request.auth != null;
      // Only allow admin users to write
      allow write: if request.auth != null && 
                    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Allow users to write to their own profile pictures
    match /profile_pictures/{userId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to write to their own documents
    match /user_documents/{userId}/{document=**} {
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Production Implementation

The current implementation includes placeholder functions that need to be replaced with actual implementations for production use:

### 1. PDF Text Extraction

Update the `extractTextFromPdf` function in `pdfService.ts` to use a proper PDF parsing library:

```typescript
export const extractTextFromPdf = async (fileUrl: string): Promise<string> => {
  try {
    console.log(`Extracting text from PDF: ${fileUrl}`);
    
    // 1. Download the PDF file
    const response = await fetch(fileUrl);
    const pdfData = await response.arrayBuffer();
    
    // 2. Use a PDF parsing library (example with pdf.js)
    const pdf = await pdfjs.getDocument(pdfData).promise;
    let fullText = '';
    
    // 3. Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};
```

### 2. Embedding Generation

Update the `createEmbedding` function in `pdfService.ts` to use OpenAI's embedding API:

```typescript
export const createEmbedding = async (text: string): Promise<number[]> => {
  try {
    console.log(`Creating embedding for text (${text.length} chars)...`);
    
    // Use OpenAI's embedding API
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
};
```

### 3. Required Dependencies

Add the following dependencies to your project:

```bash
npm install pdfjs-dist openai
```

### 4. OpenAI Configuration

Configure the OpenAI client in your project:

```typescript
// In firebase/config.ts or a separate file
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use environment variable
});
```

## Usage Instructions

1. Log in to the SafeHMO app as an admin user
2. Navigate to the PDF processing section
3. Click on the "Process PDFs" button
4. The system will:
   - List all PDFs in the specified Firebase Storage location
   - Process each PDF to extract text
   - Generate embeddings for the text
   - Store the text and embeddings in Firestore

## Troubleshooting

### Storage Access Issues

If you encounter storage access issues:

1. Verify that your Firebase Storage rules are correctly set
2. Ensure the user has admin privileges in Firestore
3. Check that the PDF documents are stored in the correct location
4. Verify that the Firebase project is correctly configured in the app

### PDF Processing Errors

If PDF processing fails:

1. Check the logs for specific error messages
2. Verify that the PDF parsing library is correctly installed and imported
3. Ensure the OpenAI API key is valid and has sufficient quota
4. Check that the PDF files are not corrupted

## Security Considerations

- Store the OpenAI API key securely using environment variables
- Implement rate limiting to prevent excessive API calls
- Ensure only admin users can trigger PDF processing
- Validate PDF files before processing to prevent security vulnerabilities

## Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
