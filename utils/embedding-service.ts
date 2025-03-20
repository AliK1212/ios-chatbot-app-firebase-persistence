// Import Buffer polyfill for browser and React Native environments
import './buffer-polyfill';

import OpenAI from 'openai';
import { OPENAI_CONFIG } from '../firebase/config';
import Constants from 'expo-constants';

// Detect environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isBrowser = typeof window !== 'undefined';
console.log(`[embedding-service] Running in ${isReactNative ? 'React Native' : isBrowser ? 'Browser' : 'Node.js'} environment`);

// Verify Buffer polyfill is working
console.log(`[embedding-service] Buffer available: ${typeof Buffer !== 'undefined'}`);
console.log(`[embedding-service] Buffer.byteLength available: ${typeof Buffer.byteLength === 'function'}`);

// Initialize OpenAI with API key from config
let openai: OpenAI | null = null;
try {
  // Check if API key is valid - try to get from Expo Constants first, then config, then env
  let apiKey = OPENAI_CONFIG.API_KEY;
  
  // Try to get from Expo Constants if available
  if (Constants && Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.openai) {
    apiKey = Constants.expoConfig.extra.openai.apiKey || apiKey;
    console.log('[embedding-service] Using API key from Expo Constants');
  }
  
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.error('[embedding-service] OpenAI API key is missing or invalid. Please set a valid API key in app.config.js or config.ts');
    openai = null;
  } else {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Allow usage in browser environments
    });
    console.log(`[embedding-service] OpenAI API configured successfully`);
  }
} catch (error) {
  console.error('[embedding-service] Failed to initialize OpenAI client:', error);
  openai = null;
}

/**
 * Generate embedding for text using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`[embedding-service] Generating embedding for text of length ${text.length}`);
    
    // Check if OpenAI is configured
    if (!openai || (!OPENAI_CONFIG.API_KEY && !process.env.OPENAI_API_KEY) || 
        OPENAI_CONFIG.API_KEY === 'your-openai-api-key-here') {
      console.warn('[embedding-service] OpenAI API key not configured or client initialization failed, using fallback embedding generation');
      return generateFallbackEmbedding(text);
    }
    
    // Truncate text if it's too long (OpenAI has a token limit)
    // Using a more conservative limit to prevent issues
    const maxTextLength = 4000;
    const truncatedText = text.length > maxTextLength ? text.substring(0, maxTextLength) : text;
    
    if (text.length > maxTextLength) {
      console.warn(`[embedding-service] Text truncated from ${text.length} to ${maxTextLength} characters for embedding generation`);
    }
    
    if (truncatedText.trim().length < 10) {
      console.warn('[embedding-service] Text is too short for embedding, returning fallback embedding');
      return generateFallbackEmbedding(truncatedText);
    }
    
    // Add retry logic for OpenAI API
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(`[embedding-service] Calling OpenAI API to generate embedding (attempt ${retries + 1}/${maxRetries})`);
        
        if (!openai) {
          throw new Error('OpenAI client not initialized');
        }
        
        const response = await openai.embeddings.create({
          model: OPENAI_CONFIG.EMBEDDING_MODEL || "text-embedding-ada-002",
          input: truncatedText.trim(),
          encoding_format: "float"
        });
        
        if (response && response.data && response.data.length > 0) {
          console.log(`[embedding-service] Successfully generated embedding with ${response.data[0].embedding.length} dimensions`);
          return response.data[0].embedding;
        } else {
          throw new Error('Empty response from OpenAI API');
        }
      } catch (apiError) {
        retries++;
        console.error(`[embedding-service] OpenAI API error (attempt ${retries}/${maxRetries}):`, apiError);
        
        // Log more detailed error information
        if (apiError instanceof Error) {
          console.error(`[embedding-service] Error details: ${apiError.message}`);
          console.error(`[embedding-service] Error stack: ${apiError.stack}`);
          
          // Check for OpenAI specific error properties
          const openAIError = apiError as any;
          if (openAIError.status) {
            console.error(`[embedding-service] OpenAI API status: ${openAIError.status}`);
          }
          if (openAIError.headers) {
            console.error(`[embedding-service] OpenAI API headers:`, openAIError.headers);
          }
          if (openAIError.error) {
            console.error(`[embedding-service] OpenAI API error details:`, openAIError.error);
          }
        } else {
          console.error(`[embedding-service] Non-Error object thrown:`, apiError);
        }
        
        if (retries >= maxRetries) {
          console.error('[embedding-service] Max retries reached, using fallback embedding generation');
          return generateFallbackEmbedding(truncatedText);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retries) * 1000;
        console.log(`[embedding-service] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the retry logic above
    return generateFallbackEmbedding(truncatedText);
  } catch (error) {
    console.error('[embedding-service] Error generating embedding:', error);
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generate a fallback embedding when OpenAI API fails
 * This creates a simple TF-IDF like representation as a fallback
 */
export function generateFallbackEmbedding(text: string): number[] {
  try {
    console.log('[embedding-service] Generating fallback embedding');
    
    // Simple dimensionality reduction using a basic hashing technique
    const dimensions = 768; // Match OpenAI's embedding dimensions
    const embedding = new Array(dimensions).fill(0);
    
    // Normalize and clean text
    const normalizedText = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
    
    // Split into words
    const words = normalizedText.split(' ');
    
    // Skip if no words
    if (words.length === 0) {
      console.warn('[embedding-service] No words found in text, returning zero embedding');
      return embedding;
    }
    
    // Simple feature hashing (Fowler-Noll-Vo hash function)
    for (const word of words) {
      if (word.length < 2) continue; // Skip very short words
      
      let hash = 0x811c9dc5; // FNV offset basis
      for (let i = 0; i < word.length; i++) {
        hash ^= word.charCodeAt(i);
        hash *= 0x01000193; // FNV prime
      }
      
      // Use modulo to map to embedding dimensions and update value
      const index = Math.abs(hash % dimensions);
      embedding[index] += 1.0 / Math.sqrt(words.length); // Normalize by document length
    }
    
    // Normalize the embedding to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    console.log('[embedding-service] Successfully generated fallback embedding');
    return embedding;
  } catch (error) {
    console.error('[embedding-service] Error generating fallback embedding:', error);
    // Return a zero vector as last resort
    return new Array(768).fill(0);
  }
}

/**
 * Calculate similarity between two embeddings using cosine similarity
 */
export function calculateSimilarity(embedding1: number[], embedding2: number[]): number {
  try {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      console.error('[embedding-service] Invalid embeddings for similarity calculation');
      return 0;
    }
    
    // Calculate dot product
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    // Calculate cosine similarity
    const similarity = dotProduct / (magnitude1 * magnitude2);
    
    // Ensure the result is within valid range [-1, 1]
    return Math.max(-1, Math.min(1, similarity));
  } catch (error) {
    console.error('[embedding-service] Error calculating similarity:', error);
    return 0;
  }
}
