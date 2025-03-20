/**
 * OpenAI API Key Setup Helper
 * 
 * This script helps users set up their OpenAI API key by:
 * 1. Checking if a .env file exists
 * 2. Creating one from .env.example if it doesn't
 * 3. Prompting the user to enter their OpenAI API key
 * 4. Updating the .env file with the provided key
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env file exists
const envExists = fs.existsSync(envPath);

// Create .env from .env.example if it doesn't exist
if (!envExists) {
  console.log('No .env file found. Creating one from .env.example...');
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('.env file created successfully!');
  } catch (error) {
    console.error('Error creating .env file:', error);
    process.exit(1);
  }
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if OpenAI API key is already set
const openAIKeyPattern = /OPENAI_API_KEY=([^\n]+)/;
const openAIKeyMatch = envContent.match(openAIKeyPattern);
const currentKey = openAIKeyMatch ? openAIKeyMatch[1] : 'your_openai_api_key';

// Prompt user for OpenAI API key
console.log('\n=== OpenAI API Key Setup ===');
console.log('The PDF chatbot requires a valid OpenAI API key to function properly.');
console.log('You can get your API key from: https://platform.openai.com/api-keys');

if (currentKey !== 'your_openai_api_key') {
  console.log(`\nCurrent OpenAI API key: ${currentKey.substring(0, 3)}...${currentKey.substring(currentKey.length - 4)}`);
}

rl.question('\nEnter your OpenAI API key (press Enter to keep current key): ', (apiKey) => {
  if (apiKey && apiKey.trim()) {
    // Update .env file with new API key
    const newEnvContent = envContent.replace(
      openAIKeyPattern,
      `OPENAI_API_KEY=${apiKey.trim()}`
    );
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('\nOpenAI API key updated successfully!');
  } else if (currentKey === 'your_openai_api_key') {
    console.log('\nNo API key provided. You will need to manually update the .env file.');
  } else {
    console.log('\nKeeping existing OpenAI API key.');
  }
  
  console.log('\nSetup complete! You can now run the application.');
  rl.close();
});
