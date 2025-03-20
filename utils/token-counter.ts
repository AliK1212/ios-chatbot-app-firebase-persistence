/**
 * Token Counter Utility
 * 
 * This utility provides functions for estimating token counts for OpenAI API calls.
 * It uses a more accurate approach than simple character counting by considering:
 * - Word boundaries
 * - Special characters
 * - Whitespace
 * - Punctuation
 * 
 * This helps provide more accurate token usage tracking and cost estimation.
 */

// Average tokens per word for English text (OpenAI's tokenizer)
const AVG_TOKENS_PER_WORD = 1.3;

// Special character handling - these often count as separate tokens
const SPECIAL_CHARS = /[`~!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?\\\s]/g;

/**
 * Calculate the estimated number of tokens in a string
 * 
 * This function provides a more accurate token count than simple character-based
 * estimation by considering word boundaries and special characters.
 * 
 * @param text - The text to calculate tokens for
 * @returns The estimated number of tokens
 */
export function calculateTokens(text: string): number {
  if (!text) return 0;
  
  // Count words (split by whitespace)
  const words = text.trim().split(/\s+/).length;
  
  // Count special characters (each typically becomes its own token)
  const specialChars = (text.match(SPECIAL_CHARS) || []).length;
  
  // Base token count from words
  const wordTokens = Math.ceil(words * AVG_TOKENS_PER_WORD);
  
  // Add special character tokens
  // Not all special chars become separate tokens, so we use a ratio
  const specialCharTokens = Math.ceil(specialChars * 0.5);
  
  // Calculate total tokens with a small buffer for edge cases
  const totalTokens = wordTokens + specialCharTokens;
  
  // Add a 10% buffer to account for tokenization edge cases
  return Math.ceil(totalTokens * 1.1);
}

/**
 * Calculate token usage for a prompt and completion
 * 
 * @param prompt - The prompt text sent to the API
 * @param completion - The completion text received from the API
 * @returns Object containing prompt, completion, and total token counts
 */
export function calculateTokenUsage(prompt: string, completion: string): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const promptTokens = calculateTokens(prompt);
  const completionTokens = calculateTokens(completion);
  
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}

/**
 * Estimate the cost of an API call based on token usage
 * 
 * @param promptTokens - Number of tokens in the prompt
 * @param completionTokens - Number of tokens in the completion
 * @param model - The model used (defaults to gpt-3.5-turbo)
 * @returns Estimated cost in USD
 */
export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'text-embedding-ada-002' = 'gpt-3.5-turbo'
): number {
  // Pricing per 1000 tokens (as of April 2023)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'text-embedding-ada-002': { prompt: 0.0001, completion: 0 }
  };
  
  const { prompt, completion } = pricing[model];
  
  // Calculate cost
  const promptCost = (promptTokens / 1000) * prompt;
  const completionCost = (completionTokens / 1000) * completion;
  
  return promptCost + completionCost;
}
