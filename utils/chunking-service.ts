/**
 * Split text into chunks for embedding - improved version with better overlap
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number = 1000, overlapSize: number = 300): string[] {
    try {
      console.log(`[chunking-service] Splitting text of length ${text.length} into chunks with ${overlapSize} character overlap`);
      
      // Safety check - limit text size
      const maxTextLength = 100000; // 100KB of text
      if (text.length > maxTextLength) {
        console.warn(`[chunking-service] Text is too large (${text.length} chars), truncating to ${maxTextLength} chars`);
        text = text.substring(0, maxTextLength);
      }
      
      // If text is shorter than max chunk size, return as a single chunk
      if (text.length <= maxChunkSize) {
        console.log('[chunking-service] Text is shorter than max chunk size, returning as single chunk');
        return [text];
      }
      
      // Use a sliding window approach with significant overlap for better context preservation
      const chunks: string[] = [];
      const effectiveChunkSize = maxChunkSize - overlapSize;
      
      // Ensure we have a minimum effective chunk size
      if (effectiveChunkSize <= 100) {
        console.warn('[chunking-service] Overlap size too large relative to max chunk size, adjusting');
        overlapSize = Math.floor(maxChunkSize * 0.3); // 30% overlap as fallback
      }
      
      // Try to split on sentence boundaries when possible
      for (let i = 0; i < text.length; i += effectiveChunkSize) {
        // For the last chunk, don't go beyond the text length
        let end = Math.min(i + maxChunkSize, text.length);
        
        // Try to find a sentence boundary near the end of the chunk
        if (end < text.length) {
          // Look for sentence endings (.!?) followed by space or newline within the last 20% of the chunk
          const searchStartPos = Math.max(end - Math.floor(maxChunkSize * 0.2), i + effectiveChunkSize);
          const searchText = text.substring(searchStartPos, end);
          
          // Find the last sentence boundary in the search text
          const sentenceEndMatch = searchText.match(/[.!?]\s+[A-Z]/g);
          if (sentenceEndMatch && sentenceEndMatch.length > 0) {
            const lastMatch = sentenceEndMatch[sentenceEndMatch.length - 1];
            const matchPos = searchText.lastIndexOf(lastMatch);
            if (matchPos !== -1) {
              // Adjust end position to include the sentence boundary (including the punctuation and space)
              end = searchStartPos + matchPos + 2;
            }
          }
        }
        
        // Extract the chunk
        const chunk = text.substring(i, end);
        
        // Only add non-empty chunks
        if (chunk.trim().length > 0) {
          chunks.push(chunk);
        }
      }
      
      console.log(`[chunking-service] Successfully split text into ${chunks.length} chunks`);
      return chunks;
    } catch (error) {
      console.error('[chunking-service] Error splitting text into chunks:', error);
      
      // Fallback to a simpler chunking method
      try {
        return chunkByParagraphs(text, maxChunkSize);
      } catch (fallbackError) {
        console.error('[chunking-service] Fallback chunking also failed:', fallbackError);
        
        // Last resort: simple fixed-size chunking with no overlap
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += maxChunkSize) {
          chunks.push(text.substring(i, Math.min(i + maxChunkSize, text.length)));
        }
        
        return chunks;
      }
    }
}

/**
 * Simple utility function to chunk text by paragraphs with overlap
 * This is a fallback method that's memory-efficient but maintains context
 */
export function chunkByParagraphs(text: string, maxChunkSize: number = 1000): string[] {
  try {
    console.log('[chunking-service] Chunking text by paragraphs');
    
    // Split text into paragraphs (sequences separated by one or more newlines)
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // Skip empty paragraphs
      if (trimmedParagraph.length === 0) {
        continue;
      }
      
      // If adding this paragraph would exceed the max chunk size, 
      // save the current chunk and start a new one
      if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        
        // Start a new chunk with some overlap from the previous chunk
        // Take the last sentence or two from the previous chunk for context
        const lastSentenceMatch = currentChunk.match(/[.!?][^.!?]*$/);
        if (lastSentenceMatch && lastSentenceMatch[0].length < maxChunkSize * 0.3) {
          currentChunk = lastSentenceMatch[0] + '\n\n' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += trimmedParagraph;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }
    
    console.log(`[chunking-service] Successfully split text into ${chunks.length} chunks by paragraphs`);
    return chunks;
  } catch (error) {
    console.error('[chunking-service] Error chunking by paragraphs:', error);
    
    // Last resort: simple fixed-size chunking with no overlap
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.substring(i, Math.min(i + maxChunkSize, text.length)));
    }
    
    return chunks;
  }
}

/**
 * Chunk structured documents based on their type - improved version
 */
export function chunkStructuredDocument(text: string, documentType: string): string[] {
    try {
      console.log(`[chunking-service] Chunking structured document of type: ${documentType}`);
      
      // Safety check - limit text size
      const maxTextLength = 100000; // 100KB of text
      if (text.length > maxTextLength) {
        console.warn(`[chunking-service] Text is too large (${text.length} chars), truncating to ${maxTextLength} chars`);
        text = text.substring(0, maxTextLength);
      }
      
      // Customize chunk size and overlap based on document type
      let maxChunkSize = 1000;
      let overlapSize = 300; // Increased overlap for better context preservation
      
      // Adjust parameters based on document type
      switch (documentType) {
        case 'legal':
          // Legal documents need larger chunks and more overlap
          maxChunkSize = 1200;
          overlapSize = 400;
          break;
        case 'financial':
          // Financial documents need precise chunking with high overlap
          maxChunkSize = 1000;
          overlapSize = 350;
          break;
        case 'medical':
          // Medical documents need high overlap for accuracy
          maxChunkSize = 1000;
          overlapSize = 400;
          break;
        case 'technical':
          // Technical documents need larger chunks
          maxChunkSize = 1200;
          overlapSize = 350;
          break;
        default:
          // Default values for other document types
          maxChunkSize = 1000;
          overlapSize = 300;
      }
      
      return splitTextIntoChunks(text, maxChunkSize, overlapSize);
    } catch (error) {
      console.error('[chunking-service] Error in chunkStructuredDocument:', error);
      // Return a single chunk with the first part of the text as a fallback
      const safeLength = Math.min(text.length, 1000);
      return [text.substring(0, safeLength)];
    }
}