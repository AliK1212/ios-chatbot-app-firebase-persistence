import OpenAI from 'openai';
import { OPENAI_CONFIG } from '../firebase/config';
import Constants from 'expo-constants';

// Create a configured OpenAI instance with browser support enabled
export const createOpenAIClient = () => {
  // Try to get API key from different sources
  // 1. First check process.env (for running in Node.js environment)
  // 2. Then check Expo Constants (for running in Expo)
  // 3. Finally fallback to config file (hardcoded value)
  const apiKey = process.env.OPENAI_API_KEY || 
                (Constants.expoConfig?.extra?.openai?.apiKey) || 
                OPENAI_CONFIG.API_KEY;
  
  console.log('[openai-config] Initializing OpenAI client');
  console.log(`[openai-config] API key source: ${process.env.OPENAI_API_KEY ? 'Environment Variable' : 
                                               (Constants.expoConfig?.extra?.openai?.apiKey) ? 'Expo Config' : 
                                               'Config File'}`);
  console.log(`[openai-config] API key availability: ${apiKey ? 'Available' : 'Not Available'}`);
  
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.error('[openai-config] No valid OpenAI API key found. Please set a valid key in your .env file, app.config.js, or firebase/config.ts');
    console.error('[openai-config] PDF processing and chat functionality will not work without a valid OpenAI API key');
  }
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

// Export a singleton instance
export const openai = createOpenAIClient();

export default openai;
