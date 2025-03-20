import OpenAI from 'openai';

// Create a configured OpenAI instance with browser support enabled
export const createOpenAIClient = () => {
  // Use environment variable from eas.json or fallback to any other source
  const apiKey = process.env.OPENAI_API_KEY || '';
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

// Export a singleton instance
export const openai = createOpenAIClient();

export default openai;
