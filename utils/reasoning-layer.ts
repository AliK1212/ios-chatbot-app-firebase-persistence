import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { openai } from './openai-config';
import { cosineSimilarity } from './vector-utils';
import { generateEmbedding } from './embedding-service';
import { OPENAI_CONFIG } from '../firebase/config';

// Configure OpenAI
const REASONING_MODEL = process.env.REASONING_MODEL || 'gpt-3.5-turbo';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-ada-002';

// Use the pre-configured OpenAI instance from openai-config.ts
const openaiInstance = openai;

// Constants
const MAX_CHUNKS_PER_DOC = 3;
const MAX_DOCS = 5;
const MIN_SIMILARITY_THRESHOLD = 0.4; // Minimum similarity threshold for filtering chunks

// Extended document chunk type
interface ExtendedDocumentChunk {
  documentId: string;
  documentTitle?: string;
  text: string;
  content?: string;
  pageNumber?: number;
  embedding?: number[];
  metadata?: {
    title?: string;
    page?: number;
  };
}

// Define interface for document with similarity score
export interface DocumentWithSimilarity {
  id: string;
  text: string;
  similarity: number;
  documentId: string;
}

// Use a cheaper model for the reasoning layer
// Options include: Mistral-7B, Llama-3-8B, or OpenAI's GPT-3.5-Turbo

/**
 * Retrieve relevant document chunks for a query
 */
async function retrieveRelevantChunks(
  query: string,
  chatbotId: string,
  maxChunks: number = 10
): Promise<(ExtendedDocumentChunk & { similarity: number; id?: string })[]> {
  try {
    console.log(`[reasoning-layer] Retrieving relevant chunks for query: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    console.log(`[reasoning-layer] Generated query embedding`);
    
    // Get all chunks directly from the chunks collection
    const db = getFirestore();
    const chunksRef = collection(db, 'chunks');
    const chunksSnapshot = await getDocs(chunksRef);
    
    if (chunksSnapshot.empty) {
      console.log('[reasoning-layer] No chunks found in the database');
      return [];
    }
    
    console.log(`[reasoning-layer] Found ${chunksSnapshot.docs.length} chunks in the chunks collection`);
    
    // Calculate similarity scores and sort by relevance
    const chunks = chunksSnapshot.docs
      .map(doc => {
        const data = doc.data() as ExtendedDocumentChunk;
        const similarity = cosineSimilarity(queryEmbedding, data.embedding || []);
        return { ...data, similarity, id: doc.id };
      })
      .filter(chunk => chunk.similarity > MIN_SIMILARITY_THRESHOLD) // Filter out low-similarity chunks
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log(`[reasoning-layer] Calculated similarity scores for ${chunks.length} chunks`);
    
    // Group chunks by document to ensure diversity
    const documentMap = new Map<string, (ExtendedDocumentChunk & { similarity: number; id?: string })[]>();
    
    for (const chunk of chunks) {
      const docId = chunk.documentId || 'unknown';
      
      if (!documentMap.has(docId)) {
        documentMap.set(docId, []);
      }
      
      const docChunks = documentMap.get(docId)!;
      
      if (docChunks.length < MAX_CHUNKS_PER_DOC) {
        docChunks.push(chunk);
      }
    }
    
    console.log(`[reasoning-layer] Grouped chunks by document, ${documentMap.size} documents`);
    
    // Flatten the map and take the top chunks
    const diverseChunks: (ExtendedDocumentChunk & { similarity: number; id?: string })[] = [];
    let docCount = 0;
    
    // Convert Map.entries() to array before iterating to avoid downlevelIteration issues
    const documentEntries = Array.from(documentMap.entries());
    
    for (const [docId, docChunks] of documentEntries) {
      if (docCount >= MAX_DOCS) break;
      
      // Sort by similarity within each document
      docChunks.sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity);
      
      // Add the top chunks from this document
      diverseChunks.push(...docChunks.slice(0, MAX_CHUNKS_PER_DOC));
      docCount++;
    }
    
    console.log(`[reasoning-layer] Selected top chunks from each document, ${diverseChunks.length} chunks`);
    
    // Sort again by similarity and take the top maxChunks
    return diverseChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxChunks);
  } catch (error) {
    console.error('[reasoning-layer] Error retrieving relevant chunks:', error);
    return [];
  }
}

/**
 * Extract numerical values and calculations from text
 */
export function extractNumericalData(text: string): { 
  numbers: number[], 
  calculations: { operation: string, values: number[] }[] 
} {
  const result = {
    numbers: [] as number[],
    calculations: [] as { operation: string, values: number[] }[]
  };
  
  console.log(`[reasoning-layer] Extracting numerical data from text: "${text}"`);
  
  // Extract all numbers
  const numberMatches = text.match(/[-+]?\d+(\.\d+)?/g) || [];
  result.numbers = numberMatches.map(n => parseFloat(n));
  
  console.log(`[reasoning-layer] Extracted ${result.numbers.length} numbers`);
  
  // Extract calculations (simple pattern matching)
  const additionMatches = text.match(/(\d+(\.\d+)?)\s*\+\s*(\d+(\.\d+)?)/g) || [];
  const subtractionMatches = text.match(/(\d+(\.\d+)?)\s*\-\s*(\d+(\.\d+)?)/g) || [];
  const multiplicationMatches = text.match(/(\d+(\.\d+)?)\s*\*\s*(\d+(\.\d+)?)/g) || [];
  const divisionMatches = text.match(/(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)/g) || [];
  
  console.log(`[reasoning-layer] Found ${additionMatches.length} additions, ${subtractionMatches.length} subtractions, ${multiplicationMatches.length} multiplications, ${divisionMatches.length} divisions`);
  
  // Process addition
  for (const match of additionMatches) {
    const values = match.split('+').map(n => parseFloat(n.trim()));
    result.calculations.push({ operation: 'addition', values });
  }
  
  // Process subtraction
  for (const match of subtractionMatches) {
    const values = match.split('-').map(n => parseFloat(n.trim()));
    result.calculations.push({ operation: 'subtraction', values });
  }
  
  // Process multiplication
  for (const match of multiplicationMatches) {
    const values = match.split('*').map(n => parseFloat(n.trim()));
    result.calculations.push({ operation: 'multiplication', values });
  }
  
  // Process division
  for (const match of divisionMatches) {
    const values = match.split('/').map(n => parseFloat(n.trim()));
    result.calculations.push({ operation: 'division', values });
  }
  
  console.log(`[reasoning-layer] Extracted ${result.calculations.length} calculations`);
  
  return result;
}

/**
 * Perform reasoning across multiple documents
 */
export async function performCrossDocumentReasoning(
  query: string,
  relevantChunks: (ExtendedDocumentChunk & { similarity: number; id?: string })[]
): Promise<string> {
  try {
    console.log(`[reasoning-layer] Performing cross-document reasoning for query: "${query}"`);
    
    // Format the document chunks for the prompt
    const documentContext = relevantChunks.map((chunk, index) => {
      const title = chunk.documentTitle || chunk.metadata?.title || 'Untitled';
      let pageNumber: number | string = chunk.pageNumber || chunk.metadata?.page || '';
      if (pageNumber === undefined || pageNumber === null || pageNumber === '' || pageNumber === 'Unknown') {
        // Use a generic page number
        pageNumber = 1;
      }
      const content = chunk.content || chunk.text || '';
      
      return `Document ${index + 1} [${title}, Page ${pageNumber}]:
${content}`;
    }).join('\n\n');
    
    console.log(`[reasoning-layer] Formatted document context for ${relevantChunks.length} chunks`);
    
    // Create the reasoning prompt
    const reasoningPrompt = `
You are a reasoning engine that analyzes information across multiple documents to answer questions.

USER QUESTION: ${query}

Here is information from ${relevantChunks.length} different documents:

${documentContext}

Your task:
1. Analyze the information across all documents
2. Identify relevant facts, figures, and calculations that answer the question
3. Provide a comprehensive answer to the question
4. Do not include citations or references in your response
5. If calculations are needed, perform them step by step.
If information is missing or contradictory, acknowledge this in your response.
`;
    
    console.log(`[reasoning-layer] Created reasoning prompt`);
    
    // Generate a response using the language model
    const response = await openaiInstance.chat.completions.create({
      model: REASONING_MODEL,
      messages: [
        { 
          role: 'system', 
          content: `You are an advanced reasoning engine for Safe HMO that analyzes information across multiple documents.

When answering questions:
1. Provide comprehensive answers using all relevant information from the documents
2. Be thorough but concise - aim for complete answers without unnecessary verbosity
3. Do not include citations or references in your responses
4. If information is not available in the documents, clearly state this
5. Consider both the document context and conversation history when formulating responses`
        },
        { role: 'user', content: reasoningPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });
    
    console.log(`[reasoning-layer] Generated response using language model`);
    
    return response.choices[0]?.message?.content || 'I could not generate a response.';
  } catch (error) {
    console.error('[reasoning-layer] Error performing cross-document reasoning:', error);
    return 'I encountered an error while trying to answer your question. Please try again.';
  }
}

/**
 * Main function to handle complex queries requiring cross-document reasoning
 */
export async function handleComplexQuery(
  query: string,
  chatbotId: string
): Promise<{ 
  answer: string, 
  sources: any[] 
}> {
  try {
    console.log(`[reasoning-layer] Handling complex query: "${query}"`);
    
    // Retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(query, chatbotId);
    console.log(`[reasoning-layer] Retrieved ${relevantChunks.length} relevant chunks`);
    
    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find any relevant information to answer your question.",
        sources: []
      };
    }
    
    // Perform cross-document reasoning
    const reasoningResult = await performCrossDocumentReasoning(query, relevantChunks);
    console.log(`[reasoning-layer] Performed cross-document reasoning`);
    
    // Extract sources for citation
    const sources = extractSourcesFromText(reasoningResult, relevantChunks);
    console.log(`[reasoning-layer] Extracted ${sources.length} sources`);
    
    return {
      answer: reasoningResult,
      sources
    };
  } catch (error) {
    console.error('[reasoning-layer] Error handling complex query:', error);
    return {
      answer: 'Error processing your question. Please try again.',
      sources: []
    };
  }
}

/**
 * Process a follow-up question with conversation context
 */
export async function processFollowUpQuestion(
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
  chatbotId: string
): Promise<{ 
  answer: string, 
  sources: any[],
  tokens: { prompt: number, completion: number } 
}> {
  try {
    console.log(`[reasoning-layer] Processing potential follow-up question: "${question}"`);
    console.log(`[reasoning-layer] Conversation history has ${conversationHistory.length} messages`);
    
    // Use the combined function to process the query
    const { isFollowUp, expandedQuery, tokens: processingTokens } = 
      await processQueryWithContext(question, conversationHistory);
    
    console.log(`[reasoning-layer] Is follow-up: ${isFollowUp}, Expanded query: "${expandedQuery}"`);
    
    // Retrieve relevant chunks for the expanded query
    const relevantChunks = await retrieveRelevantChunks(expandedQuery, chatbotId);
    
    // If the query was expanded but no relevant chunks were found, try with the original query
    if (isFollowUp && (!relevantChunks || relevantChunks.length === 0)) {
      console.log(`[reasoning-layer] No relevant chunks found for expanded query, trying original query`);
      const originalRelevantChunks = await retrieveRelevantChunks(question, chatbotId);
      
      if (originalRelevantChunks && originalRelevantChunks.length > 0) {
        console.log(`[reasoning-layer] Found ${originalRelevantChunks.length} chunks with original query`);
        
        // Perform reasoning with the original query
        const { answer, sources, tokens: reasoningTokens } = 
          await performReasoningWithContext(question, originalRelevantChunks, conversationHistory, chatbotId);
        
        // Combine token counts
        const totalTokens = {
          prompt: processingTokens.prompt + reasoningTokens.prompt,
          completion: processingTokens.completion + reasoningTokens.completion
        };
        
        return {
          answer,
          sources,
          tokens: totalTokens
        };
      }
    }
    
    // Perform reasoning with the processed query and conversation context
    const { answer, sources, tokens: reasoningTokens } = 
      await performReasoningWithContext(expandedQuery, relevantChunks, conversationHistory, chatbotId);
    
    // Combine token counts
    const totalTokens = {
      prompt: processingTokens.prompt + reasoningTokens.prompt,
      completion: processingTokens.completion + reasoningTokens.completion
    };
    
    return {
      answer,
      sources,
      tokens: totalTokens
    };
  } catch (error) {
    console.error('[reasoning-layer] Error processing follow-up question:', error);
    return {
      answer: "I'm sorry, I encountered an error processing your question. Please try again.",
      sources: [],
      tokens: { prompt: 0, completion: 0 }
    };
  }
}

/**
 * Cache for storing query responses to avoid redundant API calls
 */
const queryCache = new Map<string, {
  result: string;
  timestamp: number;
  tokens: { prompt: number, completion: number };
}>();

/**
 * Cache expiration time (30 minutes)
 */
const CACHE_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Process a query to determine if it's a follow-up and expand it if needed
 * This combines the previous detectFollowUpQuestion and expandQueryWithContext functions
 * to reduce API calls
 */
async function processQueryWithContext(
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<{ 
  isFollowUp: boolean; 
  expandedQuery: string;
  tokens: { prompt: number, completion: number };
}> {
  try {
    console.log(`[reasoning-layer] Processing query with context: "${question}"`);
    
    // Create a cache key based on the question and recent conversation
    const recentHistory = conversationHistory.slice(-4);
    const cacheKey = `${question}|${recentHistory.map(msg => `${msg.role.charAt(0)}:${msg.content.substring(0, 50)}`).join('|')}`;
    
    // Check if we have a cached result
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRATION_MS) {
      console.log('[reasoning-layer] Using cached result for query processing');
      return {
        isFollowUp: cachedResult.result !== question,
        expandedQuery: cachedResult.result,
        tokens: cachedResult.tokens
      };
    }
    
    // Basic heuristic check for follow-up indicators to avoid API call if obvious
    const followUpIndicators = [
      // Pronouns referring to previous content
      /\b(it|they|them|these|those|this|that|he|she|his|her|their|its)\b/i,
      // Questions without clear subjects
      /^(what|how|why|when|where|who|which|is|are|can|could|would|should|do|does|did)\b/i,
      // Explicit references to previous
      /\b(previous|earlier|above|before|mentioned|said|noted|you said|you mentioned)\b/i,
      // Comparative references
      /\b(more|less|better|worse|further|additional|also|too|as well|either|neither)\b/i,
      // Elliptical questions (incomplete)
      /^(and|but|so|or|if|then)\b/i,
      // Questions without a clear entity
      /^(what about|how about)\b/i
    ];
    
    // Check if the question contains any obvious follow-up indicators
    let isObviousFollowUp = false;
    for (const pattern of followUpIndicators) {
      if (pattern.test(question)) {
        isObviousFollowUp = true;
        break;
      }
    }
    
    // If it's not an obvious follow-up and the question is longer than 15 words,
    // assume it's standalone to save API calls
    const wordCount = question.split(/\s+/).length;
    if (!isObviousFollowUp && wordCount > 15) {
      console.log('[reasoning-layer] Question appears to be standalone based on length and lack of follow-up indicators');
      return {
        isFollowUp: false,
        expandedQuery: question,
        tokens: { prompt: 0, completion: 0 }
      };
    }
    
    // For questions with specific keywords that indicate a standalone query, skip API call
    const standaloneKeywords = [
      'difference', 'differences', 'compare', 'comparison', 'versus', 'vs', 
      'what is', 'what are', 'how to', 'guide', 'explain', 'definition',
      'requirements', 'regulations', 'law', 'legal', 'rules'
    ];
    
    // Check if the question contains standalone keywords
    for (const keyword of standaloneKeywords) {
      if (question.toLowerCase().includes(keyword)) {
        console.log(`[reasoning-layer] Question appears to be standalone based on keyword: ${keyword}`);
        return {
          isFollowUp: false,
          expandedQuery: question,
          tokens: { prompt: 0, completion: 0 }
        };
      }
    }
    
    // For short questions or obvious follow-ups, use the API to process
    const openai = openaiInstance;
    
    // Use only the last few exchanges to keep context manageable
    const recentConversation = conversationHistory.slice(-4); // Reduced from 6 to 4
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are an assistant that analyzes questions in the context of a conversation. Your task is to determine if the question is a follow-up that requires previous conversation context. If it is a follow-up, rewrite it as a standalone question that includes all necessary context. If it is not a follow-up, respond with the exact original question. Be concise.` 
        },
        ...recentConversation.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: `Is this a follow-up question: "${question}"? If yes, rewrite it as a standalone question. If no, respond with the exact original question.` }
      ],
      temperature: 0.3,
      max_tokens: 100, // Reduced from 150
    });
    
    let expandedQuery = question;
    if (response?.choices && 
        response.choices.length > 0 && 
        response.choices[0]?.message && 
        typeof response.choices[0].message.content === 'string') {
      expandedQuery = response.choices[0].message.content.trim();
    }
    
    console.log(`[reasoning-layer] Processed query: "${expandedQuery}"`);
    
    // Calculate token usage
    const promptTokens = calculateTokens(
      recentConversation.map(msg => msg.content).join(' ') + question
    );
    const completionTokens = calculateTokens(expandedQuery);
    
    // Cache the result
    queryCache.set(cacheKey, {
      result: expandedQuery,
      timestamp: Date.now(),
      tokens: { prompt: promptTokens, completion: completionTokens }
    });
    
    // If the expansion is much longer than the original, it's likely a good expansion
    // Otherwise, it might not be a follow-up
    const isFollowUp = expandedQuery.length > question.length * 1.2 && expandedQuery !== question;
    
    return {
      isFollowUp,
      expandedQuery: isFollowUp ? expandedQuery : question, // Use original if not a follow-up
      tokens: { prompt: promptTokens, completion: completionTokens }
    };
  } catch (error) {
    console.error('[reasoning-layer] Error processing query with context:', error);
    return { 
      isFollowUp: false, 
      expandedQuery: question,
      tokens: { prompt: 0, completion: 0 }
    };
  }
}

/**
 * Calculate the number of tokens in a string
 * This is a more accurate estimation than character-based counting
 */
function calculateTokens(text: string): number {
  if (!text) return 0;
  
  // GPT models use roughly 4 characters per token on average for English text
  // This is a more accurate estimation based on OpenAI's tokenization approach
  
  // Count words (including hyphenated words and contractions)
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Count numbers (which are typically 1 token per 2-3 digits)
  const numbers = text.match(/\d+/g) || [];
  const digitCount = numbers.reduce((sum, num) => sum + num.length, 0);
  
  // Count special characters (punctuation, symbols)
  const specialChars = (text.match(/[^\w\s]/g) || []).length;
  
  // Count non-Latin characters (CJK, emoji, etc. which use more tokens)
  const nonLatinChars = (text.match(/[^\x00-\x7F]/g) || []).length;
  
  // Calculate token estimate:
  // - Each word is roughly 1.3 tokens
  // - Every 3 digits is roughly 1 token
  // - Special characters are roughly 0.5 tokens each
  // - Non-Latin characters are roughly 1-2 tokens each
  const tokenEstimate = Math.ceil(
    wordCount * 1.3 + 
    digitCount / 3 + 
    specialChars * 0.5 + 
    nonLatinChars * 1.5
  );
  
  // Add a small buffer for safety (5%)
  return Math.ceil(tokenEstimate * 1.05);
}

/**
 * Perform reasoning with conversation context
 * Updated to return token usage information
 */
export async function performReasoningWithContext(
  query: string,
  relevantChunks: (ExtendedDocumentChunk & { similarity: number; id?: string })[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  chatbotId: string
): Promise<{ answer: string; sources: any[]; tokens: { prompt: number, completion: number } }> {
  try {
    console.log(`[reasoning-layer] Performing reasoning with context for query: "${query}"`);
    
    // If no relevant chunks were found, respond appropriately
    if (!relevantChunks || relevantChunks.length === 0) {
      console.log('[reasoning-layer] No relevant document chunks found for this query');
      
      // Create a prompt for the model to respond based only on conversation history
      const noDocumentsPrompt = `
You are a helpful assistant for Safe HMO. The user has asked a question, but I couldn't find any relevant documents in our database to answer it.

Please respond to the user's question based only on the conversation history and your general knowledge about HMOs (Houses in Multiple Occupation). If you don't know the answer, it's okay to say so. Do not include citations or references in your response.

Conversation History:
${conversationHistory.slice(-3).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

User's Question: ${query}
`;
      
      console.log(`[reasoning-layer] Created prompt for no documents`);
      
      // Generate a response using the language model
      const response = await openaiInstance.chat.completions.create({
        model: REASONING_MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You are a concise assistant for Safe HMO that provides brief, direct answers.

When answering questions:
1. Be extremely concise - use 2-3 sentences maximum
2. Focus only on the most important information
3. Avoid unnecessary details and explanations
4. Use simple, straightforward language
5. Do not include citations or references in your responses
6. If information is not available, simply state this briefly`
          },
          { role: 'user', content: noDocumentsPrompt }
        ],
        temperature: 0.2,
        max_tokens: 150,
      });
      
      console.log(`[reasoning-layer] Generated response using language model`);
      
      // Calculate token usage
      const promptTokens = calculateTokens(noDocumentsPrompt);
      const completionTokens = calculateTokens(response.choices[0]?.message?.content || "");
      
      return {
        answer: response.choices[0]?.message?.content || "I'm sorry, but I don't have any relevant information to answer your question. Please try asking something else.",
        sources: [],
        tokens: { prompt: promptTokens, completion: completionTokens }
      };
    }
    
    // Limit the number of chunks to reduce token usage
    const MAX_CHUNKS = 5;
    const limitedChunks = relevantChunks.slice(0, MAX_CHUNKS);
    
    // Format the document chunks for the prompt
    const documentContext = limitedChunks.map((chunk, index) => {
      // Ensure we have proper document titles and page numbers
      let title = chunk.documentTitle || chunk.metadata?.title || '';
      if (!title || title === 'Untitled') {
        // Try to extract a better title from the document ID if available
        if (chunk.documentId) {
          // Convert documentId to a readable title (e.g., "doc_123456" -> "Document 123456")
          const idParts = chunk.documentId.split('_');
          title = idParts.length > 1 
            ? `HMO Document ${idParts[idParts.length - 1]}` 
            : `HMO Document ${chunk.documentId}`;
        } else {
          title = `HMO Document`;
        }
      }
      
      // Handle page numbers
      let pageNumber: number | string = chunk.pageNumber || chunk.metadata?.page || '';
      if (pageNumber === undefined || pageNumber === null || pageNumber === '' || pageNumber === 'Unknown') {
        // Use a generic page number
        pageNumber = 1;
      }
      
      // Limit content length to reduce tokens
      const content = (chunk.content || chunk.text || '').substring(0, 500);
      
      return `Document ${index + 1} [${title}, Page ${pageNumber}]:
${content}`;
    }).join('\n\n');
    
    console.log(`[reasoning-layer] Formatted document context for ${limitedChunks.length} chunks`);
    
    // Format the conversation history for the prompt - use fewer messages
    const conversationContext = conversationHistory
      .slice(-3) // Only use the last 3 messages to keep the context manageable
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
    
    console.log(`[reasoning-layer] Formatted conversation context`);
    
    // Create the reasoning prompt
    const reasoningPrompt = `
You are a helpful assistant for Safe HMO. The user has asked a question, and I need you to provide a concise answer based on the relevant documents and conversation history.

Conversation History:
${conversationContext}

User's Question: ${query}

Relevant Documents:
${documentContext}

Please provide a BRIEF answer to the user's question (2-6 sentences maximum). Do not include citations or references in your response. Focus only on the most important information and avoid unnecessary details.
`;
    
    console.log(`[reasoning-layer] Created reasoning prompt`);
    
    // Generate a response using the language model
    const response = await openaiInstance.chat.completions.create({
      model: REASONING_MODEL,
      messages: [
        { 
          role: 'system', 
          content: `You are a concise assistant for Safe HMO that provides brief, direct answers.

When answering questions:
1. Be extremely concise - use 2-6 sentences maximum
2. Focus only on the most important information
3. Avoid unnecessary details and explanations
4. Use simple, straightforward language
5. Do not include citations or references in your responses`
        },
        { role: 'user', content: reasoningPrompt }
      ],
      temperature: 0.2,
      max_tokens: 150,
    });
    
    console.log(`[reasoning-layer] Generated response using language model`);
    
    // Extract sources from the response (this is a simplified approach)
    const answer = response.choices[0]?.message?.content || 'I could not generate a response.';
    
    // Extract sources from the answer text (simplified approach)
    const sources = extractSourcesFromText(answer, relevantChunks);
    console.log(`[reasoning-layer] Extracted ${sources.length} sources`);
    
    // Calculate token usage
    const promptTokens = calculateTokens(reasoningPrompt);
    const completionTokens = calculateTokens(answer);
    
    return {
      answer,
      sources,
      tokens: { prompt: promptTokens, completion: completionTokens }
    };
  } catch (error) {
    console.error('[reasoning-layer] Error performing reasoning with context:', error);
    return {
      answer: 'I encountered an error while trying to answer your question. Please try again.',
      sources: [],
      tokens: { prompt: 0, completion: 0 }
    };
  }
}

/**
 * Extract sources from text based on citations
 */
function extractSourcesFromText(
  text: string,
  chunks: (ExtendedDocumentChunk & { similarity: number; id?: string })[]
): any[] {
  try {
    console.log(`[reasoning-layer] Extracting sources from text: "${text}"`);
    
    // Create a map of document titles to page numbers
    const documentMap = new Map<string, { title: string; pageNumbers: Set<number | string>; documentId: string }>();
    
    // Process all chunks to build the document map
    chunks.forEach(chunk => {
      // Ensure we have proper document titles
      let title = chunk.documentTitle || chunk.metadata?.title || '';
      if (!title || title === 'Untitled') {
        // Try to extract a better title from the document ID if available
        if (chunk.documentId) {
          // Convert documentId to a readable title (e.g., "doc_123456" -> "Document 123456")
          const idParts = chunk.documentId.split('_');
          title = idParts.length > 1 
            ? `HMO Document ${idParts[idParts.length - 1]}` 
            : `HMO Document ${chunk.documentId}`;
        } else {
          // Use a generic title
          title = `HMO Document`;
        }
      }
      
      // Handle page numbers
      let pageNumber: number | string = chunk.pageNumber || chunk.metadata?.page || '';
      if (pageNumber === undefined || pageNumber === null || pageNumber === '' || pageNumber === 'Unknown') {
        // Use a generic page number
        pageNumber = 1;
      }
      
      if (!documentMap.has(title)) {
        documentMap.set(title, { 
          title, 
          pageNumbers: new Set(),
          documentId: chunk.documentId || ''
        });
      }
      
      documentMap.get(title)!.pageNumbers.add(pageNumber);
    });
    
    console.log(`[reasoning-layer] Created document map with ${documentMap.size} documents`);
    
    // Try to extract citations from the text using multiple regex patterns
    const citationPatterns = [
      /\[(.*?),\s*Page\s*(\d+|Unknown)\]/gi,  // Standard format: [Document Title, Page X]
      /\[(.*?),\s*p\.?\s*(\d+|Unknown)\]/gi,  // Alternative format: [Document Title, p.X]
      /\[(.*?)\s*\(Page\s*(\d+|Unknown)\)\]/gi, // Another format: [Document Title (Page X)]
      /\[(.*?)\]/gi // Fallback for document titles without page numbers
    ];
    
    const citedDocuments = new Map<string, Set<string | number>>();
    
    // Try each pattern to extract citations
    for (const pattern of citationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.length >= 2) {
          const docTitle = match[1].trim();
          const pageNum = match.length >= 3 ? match[2] : 'Unknown';
          
          if (!citedDocuments.has(docTitle)) {
            citedDocuments.set(docTitle, new Set());
          }
          
          if (pageNum && pageNum !== 'Unknown') {
            citedDocuments.get(docTitle)!.add(pageNum);
          }
        }
      }
    }
    
    // If no citations were found with the specific patterns, try a more general approach
    if (citedDocuments.size === 0) {
      // Check if any document titles appear in the text
      documentMap.forEach(({ title }) => {
        if (text.includes(title)) {
          citedDocuments.set(title, new Set([1])); // Default to page 1
        }
      });
    }
    
    // Convert the map to an array of sources
    const sources: any[] = [];
    
    // If citations were found, use them
    if (citedDocuments.size > 0) {
      citedDocuments.forEach((pageNumbers, title) => {
        // Find the matching document in our map
        let matchingDoc = documentMap.get(title);
        
        // If no exact match, try to find a partial match
        if (!matchingDoc) {
          for (const [docTitle, doc] of documentMap.entries()) {
            if (title.includes(docTitle) || docTitle.includes(title)) {
              matchingDoc = doc;
              break;
            }
          }
        }
        
        if (matchingDoc) {
          sources.push({
            documentId: matchingDoc.documentId,
            title: matchingDoc.title,
            pageNumbers: Array.from(pageNumbers.size > 0 ? pageNumbers : matchingDoc.pageNumbers)
          });
        } else {
          // If we can't find a match, still include the citation
          sources.push({
            documentId: '',
            title: title,
            pageNumbers: Array.from(pageNumbers)
          });
        }
      });
    } else {
      // If no citations were found, include the top chunks
      documentMap.forEach(({ title, pageNumbers, documentId }) => {
        sources.push({
          documentId,
          title,
          pageNumbers: Array.from(pageNumbers)
        });
      });
    }
    
    return sources;
  } catch (error) {
    console.error('[reasoning-layer] Error extracting sources:', error);
    return [];
  }
}
