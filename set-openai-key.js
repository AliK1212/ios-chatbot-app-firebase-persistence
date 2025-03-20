/**
 * OpenAI API Key Direct Setter for Expo
 * 
 * This script updates both config.ts and app.config.js with your OpenAI API key
 * for environments where .env files aren't properly loaded (like some browser environments).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to config files
const configPath = path.join(__dirname, 'firebase', 'config.ts');
const appConfigPath = path.join(__dirname, 'app.config.js');

// Read current config.ts content
let configContent = fs.readFileSync(configPath, 'utf8');

// Check if OpenAI API key is already set in config.ts
const openAIKeyPattern = /API_KEY: (.*?)( \/\/|,)/;
const openAIKeyMatch = configContent.match(openAIKeyPattern);
const currentKey = openAIKeyMatch ? openAIKeyMatch[1].trim() : 'process.env.OPENAI_API_KEY || "your-openai-api-key-here"';

// Read current app.config.js content
let appConfigContent = fs.readFileSync(appConfigPath, 'utf8');

// Check if OpenAI API key is already set in app.config.js
let appConfigKey = '';
const appConfigKeyPattern = /apiKey: "(.*?)"/;
const appConfigKeyMatch = appConfigContent.match(appConfigKeyPattern);
if (appConfigKeyMatch) {
  appConfigKey = appConfigKeyMatch[1];
}

// Read the API key from .env file if it exists
let envApiKey = '';
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envKeyMatch = envContent.match(/OPENAI_API_KEY=([^\n]+)/);
  if (envKeyMatch) {
    envApiKey = envKeyMatch[1].trim();
  }
}

console.log('\n=== OpenAI API Key Setter for Expo ===');
console.log('This script will update both config.ts and app.config.js with your OpenAI API key.');
console.log('This is necessary for Expo projects where environment variables may not be properly loaded.');
console.log('\nNote: In Expo SDK 49+, use Constants.expoConfig.extra.openai.apiKey to access this value in your code.');

if (!currentKey.includes('your-openai-api-key-here')) {
  console.log(`\nCurrent API key in config.ts: ${currentKey.substring(1, 4)}...${currentKey.substring(currentKey.length - 5, currentKey.length - 1)}`);
}

if (appConfigKey) {
  console.log(`\nCurrent API key in app.config.js: ${appConfigKey.substring(0, 3)}...${appConfigKey.substring(appConfigKey.length - 4)}`);
}

if (envApiKey) {
  console.log(`\nFound API key in .env file: ${envApiKey.substring(0, 3)}...${envApiKey.substring(envApiKey.length - 4)}`);
}

const promptText = envApiKey 
  ? '\nEnter your OpenAI API key (press Enter to use the key from .env): ' 
  : '\nEnter your OpenAI API key: ';

rl.question(promptText, (apiKey) => {
  const keyToUse = apiKey.trim() || envApiKey;
  
  if (!keyToUse) {
    console.log('\nNo API key provided. Exiting without changes.');
    rl.close();
    return;
  }
  
  // Update config.ts file with the API key
  const newConfigContent = configContent.replace(
    /API_KEY: .*?(,|\s+\/\/)/,
    `API_KEY: "${keyToUse}", // Hardcoded API key for Expo`
  );
  
  fs.writeFileSync(configPath, newConfigContent);
  console.log('\nOpenAI API key updated in config.ts!');
  
  // Update app.config.js file with the API key
  if (appConfigContent.includes('openai: {')) {
    // Update existing openai section
    const newAppConfigContent = appConfigContent.replace(
      /apiKey: ".*?"/,
      `apiKey: "${keyToUse}"`
    );
    fs.writeFileSync(appConfigPath, newAppConfigContent);
  } else {
    // Add openai section if it doesn't exist
    const newAppConfigContent = appConfigContent.replace(
      /extra: {([^}]*)}/,
      `extra: {$1,\n      openai: {\n        apiKey: "${keyToUse}"\n      }\n    }`
    );
    fs.writeFileSync(appConfigPath, newAppConfigContent);
  }
  
  console.log('OpenAI API key updated in app.config.js!');
  console.log('\nSetup complete! You can now run the application with:');
  console.log('npx expo start');
  
  rl.close();
});
