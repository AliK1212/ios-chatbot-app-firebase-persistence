/**
 * Utility functions for vector operations
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0; // Handle zero vectors
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values indicate more similar vectors
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let sum = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Calculate dot product similarity score
 * Higher values indicate more similar vectors
 */
export function dotProductSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  return dotProduct;
}

/**
 * Calculate combined similarity score using multiple metrics
 * Returns a weighted average of cosine similarity and inverse euclidean distance
 * This provides more robust similarity assessment than any single metric
 */
export function combinedSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  // Calculate cosine similarity (range -1 to 1)
  const cosine = cosineSimilarity(vecA, vecB);
  
  // Calculate euclidean distance and normalize it to a similarity score (0 to 1)
  const euclidean = euclideanDistance(vecA, vecB);
  const maxPossibleDistance = Math.sqrt(2); // Maximum possible distance for normalized vectors
  const euclideanSimilarity = 1 - (euclidean / maxPossibleDistance);
  
  // Weight the metrics (can be adjusted based on empirical performance)
  const cosineWeight = 0.7;
  const euclideanWeight = 0.3;
  
  // Combine the metrics (ensure cosine is in range 0 to 1)
  const normalizedCosine = (cosine + 1) / 2;
  return (normalizedCosine * cosineWeight) + (euclideanSimilarity * euclideanWeight);
}

/**
 * Verify if a retrieved document is actually relevant to a query
 * This helps ensure accuracy by filtering out false positives
 * @param queryText The original search query
 * @param documentText The text of the retrieved document
 * @param similarityScore The vector similarity score
 * @returns A boolean indicating if the document is truly relevant
 */
export function verifyDocumentRelevance(
  queryText: string, 
  documentText: string, 
  similarityScore: number
): boolean {
  console.log(`[verifyDocumentRelevance] Checking relevance for document with similarity score: ${similarityScore.toFixed(4)}`);
  
  // If similarity score is very high, assume it's relevant
  if (similarityScore > 0.8) {
    console.log(`[verifyDocumentRelevance] Document has very high similarity score (${similarityScore.toFixed(4)} > 0.8), considering relevant`);
    return true;
  }
  
  // Extract key terms from the query (words with 3+ characters)
  const queryTerms = queryText.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(term => term.length >= 3)
    .filter(term => !['what', 'when', 'where', 'which', 'who', 'why', 'how', 'that', 'this', 'with', 'from', 'have', 'does', 'the', 'and', 'for'].includes(term));
  
  console.log(`[verifyDocumentRelevance] Extracted key terms from query: ${queryTerms.join(', ')}`);
  
  // SafeHMO specific terms to prioritize
  const hmoTerms = ['hmo', 'property', 'tenant', 'landlord', 'regulation', 'license', 'article', 'fire', 'safety', 'council', 'room', 'kitchen', 'bathroom', 'escape', 'risk', 'assessment', 'fine', 'penalty', 'responsible', 'person', 'management', 'building', 'structure', 'modification', 'ensuite', 'en-suite', 'structural'];
  
  // Boost relevance if query contains HMO-specific terms
  const queryHmoTerms = hmoTerms.filter(term => queryText.toLowerCase().includes(term));
  const containsHmoTerms = queryHmoTerms.length > 0;
  
  if (containsHmoTerms) {
    console.log(`[verifyDocumentRelevance] Query contains HMO-specific terms: ${queryHmoTerms.join(', ')}`);
    if (similarityScore > 0.6) {
      console.log(`[verifyDocumentRelevance] Document has good similarity score (${similarityScore.toFixed(4)} > 0.6) and contains HMO terms, considering relevant`);
      return true;
    }
  }
  
  // Count how many key terms appear in the document
  const documentTextLower = documentText.toLowerCase();
  let matchCount = 0;
  const matchedTerms = [];
  
  for (const term of queryTerms) {
    if (documentTextLower.includes(term)) {
      matchCount++;
      matchedTerms.push(term);
    }
  }
  
  // Calculate match ratio
  const matchRatio = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
  console.log(`[verifyDocumentRelevance] Match ratio: ${matchRatio.toFixed(2)} (${matchCount}/${queryTerms.length} terms matched)`);
  if (matchedTerms.length > 0) {
    console.log(`[verifyDocumentRelevance] Matched terms: ${matchedTerms.join(', ')}`);
  }
  
  // For debugging, check if document contains any HMO terms
  const docHmoTerms = hmoTerms.filter(term => documentTextLower.includes(term));
  if (docHmoTerms.length > 0) {
    console.log(`[verifyDocumentRelevance] Document contains HMO terms: ${docHmoTerms.join(', ')}`);
  }
  
  // Document is relevant if either:
  // 1. The similarity score is moderate to high AND at least 20% of key terms match
  // 2. The similarity score is moderate AND at least 40% of key terms match
  // 3. For SafeHMO specific content, we can be a bit more lenient
  const isRelevant = (similarityScore > 0.5 && matchRatio >= 0.2) || 
                     (similarityScore > 0.3 && matchRatio >= 0.4) ||
                     (containsHmoTerms && similarityScore > 0.4 && matchRatio >= 0.15) ||
                     (docHmoTerms.length >= 2 && matchRatio > 0);
  
  console.log(`[verifyDocumentRelevance] Final relevance decision: ${isRelevant}`);
  return isRelevant;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  
  if (norm === 0) {
    return vec; // Cannot normalize zero vector
  }
  
  return vec.map(val => val / norm);
}

/**
 * Quantize vector values to reduce memory usage
 * @param vec The vector to quantize
 * @param bits The number of bits to use (8 or 4)
 */
export function quantizeVector(vec: number[], bits: 8 | 4 = 8): Uint8Array {
  // Find min and max values
  let min = Math.min(...vec);
  let max = Math.max(...vec);
  
  // Ensure min and max are different
  if (min === max) {
    max = min + 1;
  }
  
  const range = max - min;
  const maxValue = bits === 8 ? 255 : 15;
  
  // Create quantized array
  const quantized = new Uint8Array(vec.length);
  
  for (let i = 0; i < vec.length; i++) {
    // Scale to [0, maxValue]
    const scaled = Math.round(((vec[i] - min) / range) * maxValue);
    quantized[i] = Math.max(0, Math.min(maxValue, scaled));
  }
  
  return quantized;
}

/**
 * Dequantize a vector back to floating point
 */
export function dequantizeVector(quantized: Uint8Array, min: number, max: number, bits: 8 | 4 = 8): number[] {
  const maxValue = bits === 8 ? 255 : 15;
  const range = max - min;
  
  const dequantized = new Array(quantized.length);
  
  for (let i = 0; i < quantized.length; i++) {
    dequantized[i] = min + (quantized[i] / maxValue) * range;
  }
  
  return dequantized;
}

/**
 * Perform dimensionality reduction using PCA
 * This is a simplified implementation and may not be suitable for production use
 */
export function simplePCA(vectors: number[][], targetDimensions: number): number[][] {
  if (vectors.length === 0) {
    return [];
  }
  
  const n = vectors.length;
  const d = vectors[0].length;
  
  if (targetDimensions >= d) {
    return [...vectors]; // No reduction needed
  }
  
  // Calculate mean vector
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += vectors[i][j] / n;
    }
  }
  
  // Center the data
  const centered = vectors.map(vec => 
    vec.map((val, j) => val - mean[j])
  );
  
  // Calculate covariance matrix (simplified)
  const covariance = new Array(d).fill(0).map(() => new Array(d).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      for (let k = 0; k < d; k++) {
        covariance[j][k] += (centered[i][j] * centered[i][k]) / n;
      }
    }
  }
  
  // For a real implementation, you would compute eigenvectors here
  // This is a simplified approach that just selects the first targetDimensions
  
  // Project data onto first targetDimensions dimensions
  return centered.map(vec => vec.slice(0, targetDimensions));
}
