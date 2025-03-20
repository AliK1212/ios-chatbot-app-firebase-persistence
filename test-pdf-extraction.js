/**
 * Test script for PDF text extraction on mobile devices
 * 
 * This script can be run to test the PDF extraction functionality
 * on mobile devices (iOS/Android) and ensure it works properly.
 */

import { extractTextFromDocument } from './utils/text-extractor';
import { processPdf } from './firebase/pdfService';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Test PDF extraction by selecting a file from the device
 */
export async function testPdfExtraction() {
  try {
    console.log('Starting PDF extraction test...');
    
    // Pick a PDF file using the document picker
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true
    });
    
    if (result.canceled) {
      console.log('Document picking was canceled');
      return {
        success: false,
        error: 'Document picking was canceled'
      };
    }
    
    const file = result.assets[0];
    console.log(`Selected file: ${file.name}, size: ${file.size} bytes, uri: ${file.uri}`);
    
    // Read the file as a base64 string
    const base64Content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;
    
    console.log(`Converted file to ArrayBuffer, size: ${arrayBuffer.byteLength} bytes`);
    
    // Test direct text extraction
    console.log('Testing direct text extraction...');
    const extractionStartTime = Date.now();
    const extractedDoc = await extractTextFromDocument(arrayBuffer, file.name);
    const extractionTime = Date.now() - extractionStartTime;
    
    console.log(`Text extraction completed in ${extractionTime}ms`);
    console.log(`Extracted ${extractedDoc.text.length} characters, ${extractedDoc.pageCount} pages`);
    console.log(`First 200 characters of extracted text: ${extractedDoc.text.substring(0, 200)}`);
    
    // Test full PDF processing
    console.log('Testing full PDF processing...');
    const processingStartTime = Date.now();
    const processingResult = await processPdf(arrayBuffer, file.name);
    const processingTime = Date.now() - processingStartTime;
    
    console.log(`PDF processing completed in ${processingTime}ms`);
    console.log('Processing result:', processingResult);
    
    return {
      success: true,
      extractionResult: {
        textLength: extractedDoc.text.length,
        pageCount: extractedDoc.pageCount,
        extractionTime,
        textSample: extractedDoc.text.substring(0, 200)
      },
      processingResult: {
        ...processingResult,
        processingTime
      }
    };
  } catch (error) {
    console.error('Error testing PDF extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export a function that can be called from a UI component
export default {
  testPdfExtraction
};
