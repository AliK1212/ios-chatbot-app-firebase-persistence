// Import Buffer polyfill for browser environments
import './buffer-polyfill';

// Conditional import to prevent errors in React Native environment
let pdfParse: any = null;
try {
  // Only try to import in Node.js environment
  if (typeof window === 'undefined') {
    pdfParse = require('pdf-parse');
    console.log('[text-extractor] Loaded pdf-parse module for Node.js environment');
  } else {
    console.log('[text-extractor] Running in browser/mobile environment, pdf-parse not available');
  }
} catch (error) {
  console.warn('[text-extractor] Failed to load pdf-parse module:', error);
}

// Detect if we're in a React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
console.log(`[text-extractor] Environment: ${isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js'}`);
console.log(`[text-extractor] Buffer available: ${typeof Buffer !== 'undefined'}`);
console.log(`[text-extractor] Buffer.byteLength available: ${typeof Buffer.byteLength === 'function'}`);

/**
 * Interface for extracted document text
 */
export interface ExtractedDocument {
  text: string;
  pageCount: number;
  fileType: string;
}

/**
 * Maximum text size to extract from a document (in characters)
 * This helps prevent memory issues with extremely large documents
 */
const MAX_TEXT_SIZE = 500000; // ~500KB of text

/**
 * Load PDF.js dynamically for browser environments
 * Note: This won't work in React Native, only in web browsers
 */
async function loadPdfJs() {
  if (typeof window !== 'undefined' && !isReactNative) {
    try {
      // Check if PDF.js is already loaded
      if (!(window as any).pdfjsLib) {
        console.log('[text-extractor] Loading PDF.js library dynamically');
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.async = true;
        
        // Wait for the script to load
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('Failed to load PDF.js'));
          document.head.appendChild(script);
        });
        
        console.log('[text-extractor] PDF.js loaded successfully');
      } else {
        console.log('[text-extractor] PDF.js already loaded');
      }
      
      return (window as any).pdfjsLib;
    } catch (error) {
      console.error('[text-extractor] Error loading PDF.js:', error);
      return null;
    }
  }
  return null;
}

/**
 * Extract text from a PDF using PDF.js in browser environments
 */
async function extractTextWithPdfJs(arrayBuffer: ArrayBuffer, fileName: string): Promise<ExtractedDocument> {
  try {
    console.log('[extractTextFromPdf] Attempting to extract text with PDF.js');
    
    // Load PDF.js
    const pdfjsLib = await loadPdfJs();
    if (!pdfjsLib) {
      throw new Error('PDF.js library not available');
    }
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`[extractTextFromPdf] PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from each page
    let extractedText = '';
    
    // Process pages in sequence
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`[extractTextFromPdf] Processing page ${pageNum}/${pdf.numPages}`);
      
      // Get the page
      const page = await pdf.getPage(pageNum);
      
      // Extract text content
      const textContent = await page.getTextContent();
      
      // Concatenate the text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + '\n\n';
      
      // Check if we've reached the maximum text size
      if (extractedText.length > MAX_TEXT_SIZE) {
        console.warn(`[extractTextFromPdf] Reached maximum text size (${MAX_TEXT_SIZE} characters), truncating`);
        extractedText = extractedText.substring(0, MAX_TEXT_SIZE);
        break;
      }
    }
    
    console.log(`[extractTextFromPdf] Successfully extracted ${extractedText.length} characters from ${pdf.numPages} pages`);
    
    return {
      text: extractedText.trim(),
      pageCount: pdf.numPages,
      fileType: 'pdf'
    };
  } catch (error) {
    console.error('[extractTextFromPdf] Error extracting text with PDF.js:', error);
    throw error;
  }
}

/**
 * Detect if a file is a PDF by checking its signature
 * This works in all environments including React Native
 */
function isPdfFormat(buffer: Buffer | Uint8Array | ArrayBuffer): boolean {
  try {
    // Convert to Uint8Array for consistent access
    const uint8Array = buffer instanceof ArrayBuffer 
      ? new Uint8Array(buffer) 
      : buffer instanceof Buffer 
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : buffer;
    
    // Check for PDF signature: %PDF-
    if (uint8Array.length < 5) return false;
    
    return uint8Array[0] === 0x25 && // %
           uint8Array[1] === 0x50 && // P
           uint8Array[2] === 0x44 && // D
           uint8Array[3] === 0x46 && // F
           uint8Array[4] === 0x2D;   // -
  } catch (error) {
    console.error('[isPdfFormat] Error checking PDF format:', error);
    return false;
  }
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPdf(fileBuffer: Buffer | Uint8Array | ArrayBuffer, fileName: string): Promise<ExtractedDocument> {
  let extractedText = '';
  let pageCount = 1;
  const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text';
  
  try {
    // Ensure fileBuffer is in the right format
    let processBuffer: Buffer | Uint8Array;
    let arrayBuffer: ArrayBuffer;
    
    if (fileBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileBuffer;
      processBuffer = new Uint8Array(fileBuffer);
      console.log(`[extractTextFromPdf] Converted ArrayBuffer to Uint8Array for ${fileName}`);
    } else {
      processBuffer = fileBuffer;
      arrayBuffer = processBuffer instanceof Buffer 
        ? processBuffer.buffer.slice(processBuffer.byteOffset, processBuffer.byteOffset + processBuffer.byteLength)
        : processBuffer.buffer;
    }
    
    console.log(`[extractTextFromPdf] Starting PDF extraction for ${fileName}, buffer size: ${
      'byteLength' in processBuffer ? processBuffer.byteLength : (processBuffer as Buffer).length
    } bytes`);
    console.log(`[extractTextFromPdf] Environment: ${isReactNative ? 'React Native' : typeof window !== 'undefined' ? 'Browser' : 'Node.js'}`);
    console.log(`[extractTextFromPdf] PDF parser available: ${!!pdfParse}`);
    
    // APPROACH 1: Try using pdf-parse in Node.js environment
    if (pdfParse && typeof window === 'undefined') {
      try {
        console.log('[extractTextFromPdf] Attempting to parse PDF with pdf-parse');
        
        // Ensure we have a Buffer for pdf-parse
        const bufferForParse = Buffer.isBuffer(processBuffer) 
          ? processBuffer 
          : Buffer.from(processBuffer.buffer, processBuffer.byteOffset, processBuffer.byteLength);
        
        const pdfData = await pdfParse(bufferForParse);
        
        // Store page count for metadata
        pageCount = pdfData.numpages || 1;
        console.log(`[extractTextFromPdf] PDF has ${pageCount} pages`);
        
        if (!pdfData || !pdfData.text || pdfData.text.trim().length < 100) {
          console.warn('[extractTextFromPdf] PDF parsing returned insufficient text, trying alternative extraction method');
          throw new Error('PDF parsing returned insufficient text');
        }
        
        // Check if the extracted text contains PDF structure elements
        if (pdfData.text.includes('/Type /StructElem') || 
            pdfData.text.includes('endobj') || 
            pdfData.text.includes('/S /P /P') ||
            pdfData.text.includes('%PDF-')) {
          console.warn('[extractTextFromPdf] PDF text contains PDF structure elements, trying alternative extraction');
          throw new Error('PDF text contains PDF structure elements');
        }
        
        extractedText = pdfData.text;
        console.log(`[extractTextFromPdf] PDF parsed successfully, extracted ${extractedText.length} characters from ${pageCount} pages`);
        
        return {
          text: extractedText,
          pageCount,
          fileType
        };
      } catch (pdfParseError) {
        console.error('[extractTextFromPdf] PDF parsing failed:', pdfParseError);
        console.log('[extractTextFromPdf] Falling back to alternative extraction method');
        // Continue to fallback method
      }
    }
    
    // APPROACH 2: Try using PDF.js in browser environments (not React Native)
    if (typeof window !== 'undefined' && !isReactNative) {
      try {
        // Use PDF.js for browser environments
        return await extractTextWithPdfJs(arrayBuffer, fileName);
      } catch (pdfJsError) {
        console.error('[extractTextFromPdf] PDF.js extraction failed:', pdfJsError);
        console.log('[extractTextFromPdf] Falling back to placeholder text');
      }
    }
    
    // APPROACH 3: For React Native or when other methods fail
    console.log('[extractTextFromPdf] Using fallback text extraction method');
    
    // Generate a deterministic page count based on the file size
    pageCount = Math.max(1, Math.floor((processBuffer.byteLength || (processBuffer as Buffer).length) / 5000));
    console.log(`[extractTextFromPdf] Estimated ${pageCount} pages based on file size`);
    
    if (isReactNative) {
      // For React Native, we need to use a specialized approach
      console.log('[extractTextFromPdf] Using React Native specific approach');
      
      try {
        // Try to extract some basic metadata from the PDF header
        const header = new Uint8Array(arrayBuffer, 0, Math.min(1024, arrayBuffer.byteLength));
        const headerText = String.fromCharCode.apply(null, Array.from(header));
        
        // Look for PDF version in header
        const versionMatch = headerText.match(/%PDF-(\d+\.\d+)/);
        const pdfVersion = versionMatch ? versionMatch[1] : 'unknown';
        
        console.log(`[extractTextFromPdf] PDF version: ${pdfVersion}`);
        
        // Extract text directly from the PDF binary data
        // This is a simplified approach but will extract some real text
        const uint8Array = new Uint8Array(arrayBuffer);
        let extractedContent = '';
        
        // First pass: Extract text objects from the PDF
        const textMarkers = ['/Text', '/Contents', '/Title', '/Subject', '/Keywords', '/Author'];
        const textObjectRegex = /\(([^\)\\]*(?:\\.[^\)\\]*)*)\)/g;
        
        // Convert the first portion of the PDF to a string for regex searching
        // We limit this to avoid memory issues with large PDFs
        const maxSearchSize = Math.min(uint8Array.length, 1000000); // 1MB max search size
        let pdfTextContent = '';
        
        for (let i = 0; i < maxSearchSize; i++) {
          // Only include ASCII printable characters and common control chars
          if ((uint8Array[i] >= 32 && uint8Array[i] <= 126) || 
              uint8Array[i] === 9 || uint8Array[i] === 10 || uint8Array[i] === 13) {
            pdfTextContent += String.fromCharCode(uint8Array[i]);
          }
        }
        
        // Find text objects in the PDF
        let textObjects = [];
        let match;
        
        // Look for text in parentheses (common PDF text format)
        while ((match = textObjectRegex.exec(pdfTextContent)) !== null) {
          if (match[1] && match[1].length > 1) {
            // Clean up the text - handle PDF escape sequences
            let text = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
            
            // Only add if it looks like real text (contains spaces or multiple words)
            if (text.includes(' ') || /[a-zA-Z]{3,}/.test(text)) {
              textObjects.push(text);
            }
          }
        }
        
        // Second pass: Look for streams that might contain text
        // This is a simplified approach that won't work for all PDFs
        const streamMarkers = ['stream', 'endstream'];
        let inStream = false;
        let streamStart = -1;
        
        for (let i = 0; i < maxSearchSize - 10; i++) {
          // Check for stream markers
          if (!inStream && 
              uint8Array[i] === 115 && // 's'
              uint8Array[i+1] === 116 && // 't'
              uint8Array[i+2] === 114 && // 'r'
              uint8Array[i+3] === 101 && // 'e'
              uint8Array[i+4] === 97 && // 'a'
              uint8Array[i+5] === 109) { // 'm'
            inStream = true;
            streamStart = i + 6;
            
            // Skip newline after 'stream'
            if (uint8Array[streamStart] === 13 && uint8Array[streamStart+1] === 10) {
              streamStart += 2;
            } else if (uint8Array[streamStart] === 10) {
              streamStart += 1;
            }
          } 
          else if (inStream && 
                  uint8Array[i] === 101 && // 'e'
                  uint8Array[i+1] === 110 && // 'n'
                  uint8Array[i+2] === 100 && // 'd'
                  uint8Array[i+3] === 115 && // 's'
                  uint8Array[i+4] === 116 && // 't'
                  uint8Array[i+5] === 114 && // 'r'
                  uint8Array[i+6] === 101 && // 'e'
                  uint8Array[i+7] === 97 && // 'a'
                  uint8Array[i+8] === 109) { // 'm'
            inStream = false;
            
            // Process stream content
            if (streamStart > 0 && i - streamStart > 10) {
              // Extract ASCII text from stream
              let streamText = '';
              for (let j = streamStart; j < i; j++) {
                if (uint8Array[j] >= 32 && uint8Array[j] <= 126) {
                  streamText += String.fromCharCode(uint8Array[j]);
                } else if (uint8Array[j] === 9 || uint8Array[j] === 10 || uint8Array[j] === 13) {
                  streamText += ' ';
                }
              }
              
              // Clean up stream text
              streamText = streamText.replace(/\s+/g, ' ').trim();
              
              // Only add if it looks like real text
              if (streamText.length > 20 && 
                  streamText.includes(' ') && 
                  !/^\d+\s\d+\s\d+\s\d+\s/.test(streamText) && // Skip coordinate data
                  /[a-zA-Z]{3,}/.test(streamText)) { // Contains words
                textObjects.push(streamText);
              }
            }
            
            streamStart = -1;
          }
        }
        
        // Combine all extracted text
        if (textObjects.length > 0) {
          // Sort by length (descending) to prioritize larger text blocks
          textObjects.sort((a, b) => b.length - a.length);
          
          // Take the top 50 text objects to avoid memory issues
          const topTextObjects = textObjects.slice(0, 50);
          
          // Join text objects with newlines
          extractedContent = topTextObjects.join('\n\n');
          
          // Limit the total size
          if (extractedContent.length > MAX_TEXT_SIZE) {
            extractedContent = extractedContent.substring(0, MAX_TEXT_SIZE);
          }
          
          console.log(`[extractTextFromPdf] Extracted ${extractedContent.length} characters of real text from PDF`);
        }
        
        // If we couldn't extract any meaningful text, provide a helpful message
        if (!extractedContent || extractedContent.length < 100) {
          console.log('[extractTextFromPdf] Could not extract sufficient text, using metadata-based approach');
          
          extractedText = `[PDF Document: ${fileName}]
          
This PDF document (version ${pdfVersion}) contains approximately ${pageCount} pages.

The document has been processed and its metadata saved. The text extraction on mobile devices is limited, but you can still ask questions about this document using its title and metadata.

For optimal results, consider processing this document on the web version of the application.`;
        } else {
          // Use the real extracted text
          extractedText = extractedContent;
          console.log(`[extractTextFromPdf] Successfully extracted ${extractedText.length} characters of text from PDF on mobile`);
        }
      } catch (rnError) {
        console.error('[extractTextFromPdf] Error in React Native extraction:', rnError);
        
        // Fallback message for React Native
        extractedText = `PDF text extraction encountered an error in this mobile version. 
        The document "${fileName}" has been processed, but only limited content could be extracted.
        You can still ask questions about this document, but for best results, try using the web version.`;
      }
    } else {
      // For other environments, provide a more detailed fallback
      try {
        // Try to extract basic PDF structure information
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdfSignature = '%PDF-';
        let pdfText = '';
        
        // Check if this is actually a PDF
        const signatureBytes = pdfSignature.split('').map(c => c.charCodeAt(0));
        let isPdf = true;
        
        for (let i = 0; i < signatureBytes.length; i++) {
          if (uint8Array[i] !== signatureBytes[i]) {
            isPdf = false;
            break;
          }
        }
        
        if (isPdf) {
          // Extract some basic text from the PDF
          // This is a very basic approach and won't work well for most PDFs
          // but it's better than nothing when other methods fail
          for (let i = 0; i < uint8Array.length; i++) {
            // Only include ASCII printable characters
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              pdfText += String.fromCharCode(uint8Array[i]);
            }
          }
          
          // Clean up the text - remove PDF syntax elements
          pdfText = pdfText.replace(/<<.*?>>/g, ' ')
            .replace(/\/([\w]+)/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Limit the length
          if (pdfText.length > MAX_TEXT_SIZE) {
            pdfText = pdfText.substring(0, MAX_TEXT_SIZE);
          }
          
          if (pdfText.length > 100) {
            console.log(`[extractTextFromPdf] Extracted ${pdfText.length} characters using basic extraction`);
            extractedText = pdfText;
            return {
              text: extractedText,
              pageCount,
              fileType
            };
          }
        }
        
        // If basic extraction failed or returned too little text, use the placeholder
        console.log('[extractTextFromPdf] Basic extraction failed, using placeholder');
        extractedText = `This PDF document "${fileName}" could not be fully processed with the available tools.
        
In a production environment, this application would:
1. Use a server-side PDF processing service
2. Implement a more robust PDF parsing library
3. Pre-process documents and store the extracted text
        
The document has been indexed with its basic metadata.`;
      } catch (fallbackError) {
        console.error('[extractTextFromPdf] Error in fallback extraction:', fallbackError);
        
        // Last resort placeholder
        extractedText = `This is a simulated extraction of the PDF document "${fileName}".
        In a production environment, you would use a proper PDF parsing library or
        send the PDF to a server for processing. The actual content of the document
        would be extracted and processed here.`;
      }
    }
    
    console.log(`[extractTextFromPdf] Generated ${extractedText.length} characters of text`);
    
    return {
      text: extractedText,
      pageCount,
      fileType
    };
  } catch (error) {
    console.error('[extractTextFromPdf] Error in PDF text extraction:', error);
    
    // Last resort fallback - return minimal content
    return {
      text: `Failed to extract text from ${fileName}. Error: ${error instanceof Error ? error.message : String(error)}`,
      pageCount: 1,
      fileType
    };
  }
}

/**
 * Extract text as plain text
 */
export async function extractTextAsPlainText(fileBuffer: Buffer | Uint8Array | ArrayBuffer, fileName: string): Promise<ExtractedDocument> {
  try {
    console.log(`[extractTextAsPlainText] Extracting text from ${fileName}`);
    
    // Ensure fileBuffer is in the right format
    let processBuffer: Buffer | Uint8Array;
    if (fileBuffer instanceof ArrayBuffer) {
      processBuffer = new Uint8Array(fileBuffer);
      console.log(`[extractTextAsPlainText] Converted ArrayBuffer to Uint8Array for ${fileName}`);
    } else {
      processBuffer = fileBuffer;
    }
    
    // Determine file type based on extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt';
    
    // Convert buffer to string
    let text = '';
    
    // Check if we're in React Native
    if (isReactNative) {
      console.log('[extractTextAsPlainText] Using React Native specific approach');
      
      try {
        // For React Native, we need to be careful with large buffers
        const maxPreviewSize = 10000; // Limit preview size to avoid memory issues
        const previewBuffer = processBuffer.slice(0, Math.min(maxPreviewSize, processBuffer.length || processBuffer.byteLength));
        
        // Try to get a preview of the text
        let previewText = '';
        try {
          previewText = new TextDecoder('utf-8').decode(previewBuffer);
        } catch (e) {
          console.warn(`[extractTextAsPlainText] Error decoding preview with TextDecoder: ${e}`);
          
          // Fallback for React Native
          previewText = Array.from(previewBuffer)
            .map(byte => String.fromCharCode(byte))
            .join('');
        }
        
        // For binary files, provide a helpful message
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x80-\xFF]/.test(previewText)) {
          console.log('[extractTextAsPlainText] File appears to be binary');
          text = `[Binary file: ${fileName}]
          
This file appears to be a binary file (${fileExtension.toUpperCase()} format) and not plain text.
In a production environment, this application would use appropriate parsers for this file type.`;
        } else {
          // For text files, return the preview and a note
          text = previewText;
          
          if (processBuffer.length > maxPreviewSize || processBuffer.byteLength > maxPreviewSize) {
            text += `\n\n[Note: This file is large (${processBuffer.length || processBuffer.byteLength} bytes). 
            Only showing the first ${maxPreviewSize} bytes in this preview.]`;
          }
        }
      } catch (rnError) {
        console.error('[extractTextAsPlainText] Error in React Native text extraction:', rnError);
        text = `Could not extract text from ${fileName} in this mobile environment.`;
      }
    } else {
      // For browser and Node.js environments
      try {
        // Try to decode as UTF-8
        if (typeof TextDecoder !== 'undefined') {
          // Browser approach
          text = new TextDecoder('utf-8').decode(processBuffer);
        } else if (Buffer.isBuffer(processBuffer)) {
          // Node.js approach
          text = processBuffer.toString('utf8');
        } else {
          // Fallback approach
          text = Array.from(processBuffer)
            .map(byte => String.fromCharCode(byte))
            .join('');
        }
        
        // Check if the text looks like binary data
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x80-\xFF]/.test(text.substring(0, 1000))) {
          console.warn('[extractTextAsPlainText] File appears to be binary, not text');
          
          // For binary files, provide a helpful message
          text = `[Binary file: ${fileName}]
          
This file appears to be a binary file (${fileExtension.toUpperCase()} format) and not plain text.
In a production environment, this application would use appropriate parsers for this file type.`;
        }
      } catch (e) {
        console.warn(`[extractTextAsPlainText] Error decoding as UTF-8: ${e}`);
        
        // Fallback to ASCII
        try {
          if (typeof TextDecoder !== 'undefined') {
            text = new TextDecoder('ascii').decode(processBuffer);
          } else if (Buffer.isBuffer(processBuffer)) {
            text = processBuffer.toString('ascii');
          } else {
            text = Array.from(processBuffer)
              .map(byte => byte < 128 ? String.fromCharCode(byte) : '?')
              .join('');
          }
        } catch (asciiError) {
          console.error('[extractTextAsPlainText] Error decoding as ASCII:', asciiError);
          text = `Could not decode ${fileName} as text. The file may be binary or corrupted.`;
        }
      }
    }
    
    console.log(`[extractTextAsPlainText] Extracted ${text.length} characters from ${fileName}`);
    
    return {
      text,
      pageCount: 1,
      fileType: fileExtension
    };
  } catch (error) {
    console.error('[extractTextAsPlainText] Error extracting text:', error);
    
    // Return a minimal result with error information
    return {
      text: `Error extracting text from ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      pageCount: 1,
      fileType: 'unknown'
    };
  }
}

/**
 * Extract text from a document buffer based on file type
 */
export async function extractTextFromDocument(fileBuffer: Buffer | Uint8Array | ArrayBuffer, fileName: string): Promise<ExtractedDocument> {
  try {
    console.log(`[extractTextFromDocument] Extracting text from ${fileName}`);
    
    // Determine file type from extension
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    console.log(`[extractTextFromDocument] File type: ${fileType}`);
    
    // For PDFs, use specialized PDF extraction
    if (fileType === 'pdf' || isPdfFormat(fileBuffer)) {
      console.log(`[extractTextFromDocument] Using PDF extraction for ${fileName}`);
      return await extractTextFromPdf(fileBuffer, fileName);
    }
    
    // For text files, use plain text extraction
    if (['txt', 'md', 'csv', 'json', 'html', 'xml', 'js', 'ts', 'css'].includes(fileType)) {
      console.log(`[extractTextFromDocument] Using plain text extraction for ${fileName}`);
      return await extractTextAsPlainText(fileBuffer, fileName);
    }
    
    // For unsupported file types, provide a helpful message
    console.warn(`[extractTextFromDocument] Unsupported file type: ${fileType}`);
    return {
      text: `Unsupported file type: ${fileType}. Please upload a PDF or text file.`,
      pageCount: 1,
      fileType
    };
  } catch (error) {
    console.error('[extractTextFromDocument] Error extracting text:', error);
    
    // Return a minimal result with error information
    return {
      text: `Error extracting text: ${error instanceof Error ? error.message : String(error)}`,
      pageCount: 1,
      fileType: 'unknown'
    };
  }
}
