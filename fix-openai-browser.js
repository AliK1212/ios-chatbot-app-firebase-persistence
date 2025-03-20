#!/usr/bin/env node

/**
 * Fix OpenAI Browser Issue
 * 
 * This script creates a utility file that configures OpenAI to work in browser environments
 * without needing to use patch-package, which can cause issues during EAS builds.
 */

const fs = require('fs');
const path = require('path');

// Path to the utility file
const utilPath = path.join(__dirname, 'utils', 'openai-config.ts');

// Ensure utils directory exists
if (!fs.existsSync(path.join(__dirname, 'utils'))) {
  fs.mkdirSync(path.join(__dirname, 'utils'), { recursive: true });
}

// Content for the OpenAI configuration utility
const utilContent = `import OpenAI from 'openai';

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
`;

// Write the utility file
fs.writeFileSync(utilPath, utilContent);

console.log('✅ Created OpenAI browser-compatible configuration at utils/openai-config.ts');
console.log('🔍 You can now import this instead of directly importing from openai');
console.log('📝 Example: import { openai } from "../utils/openai-config";');

// Exit with success
process.exit(0);
