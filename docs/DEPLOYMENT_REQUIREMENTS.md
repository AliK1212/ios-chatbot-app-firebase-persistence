# Safe HMO App - Required Accounts & Credentials

## Required Firebase Configuration Steps
1. Create new production project
2. Enable Authentication with proper persistence
3. Configure security rules for Firestore
4. Set up proper error handling
5. Test offline functionality

## Required Developer Accounts

### 1. Apple Developer Account
- **Purpose**: Required for iOS App Store deployment
- **Cost**: $99/year
- **Setup Steps**:
  1. Visit https://developer.apple.com/programs/enroll/
  2. Create an Apple ID if you don't have one
  3. Complete the enrollment process
  4. Once approved, provide these details to your development team:
     - Apple Developer Team ID
     - App Store Connect API Key
     - App-specific password for deployment

### 2. Google Play Developer Account
- **Purpose**: Required for Android Play Store deployment
- **Cost**: $25 (one-time fee)
- **Setup Steps**:
  1. Visit https://play.google.com/console/signup
  2. Create account and pay registration fee
  3. Complete account details and verification
  4. Provide the following to your development team:
     - Google Play Console access
     - Keystore file for app signing
     - Service account credentials

### 3. Firebase Production Account
- **Purpose**: Backend services (Authentication, Database, Storage)
- **Cost**: Based on usage (starts with free tier)
- **Setup Steps**:
  1. Visit https://console.firebase.google.com/
  2. Create a new project (e.g., "safehmo-production")
  3. Enable required services:
     - Authentication (Email/Password)
     - Firestore Database
     - Storage
  4. Set up security rules
  5. Create a new web app
  6. Share the following with your development team:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_PRODUCTION_API_KEY",
       authDomain: "your-project-id.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project-id.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     };
     ```
  7. Configure Firebase Storage CORS settings:
     - Follow the instructions in `docs/firebase-cors-setup.txt`
     - This is required for PDF processing functionality

### 4. OpenAI API Account
- **Purpose**: Required for PDF processing and chatbot functionality
- **Cost**: Based on usage (pay-as-you-go)
- **Setup Steps**:
  1. Visit https://platform.openai.com/signup
  2. Create an account and add a payment method
  3. Generate an API key from the API Keys section
  4. Add the API key to your environment variables or .env file:
     ```
     OPENAI_API_KEY=your-openai-api-key
     OPENAI_MODEL=gpt-3.5-turbo
     OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
     ```
  5. Test the PDF processing functionality to ensure it works correctly

## PDF Processing Requirements

The application uses PDF processing for the chatbot functionality. To ensure this works correctly:

1. **Firebase Storage Configuration**:
   - PDFs should be uploaded to the `pdf_documents/` directory in Firebase Storage
   - Storage rules must allow read access to these files
   - CORS must be properly configured (see `docs/firebase-cors-setup.txt`)

2. **PDF Processing Dependencies**:
   - The application uses `pdf-parse` for extracting text from PDFs
   - OpenAI API is used for generating embeddings and chat responses
   - Ensure all dependencies are installed: `npm install pdf-parse openai`

3. **Testing PDF Processing**:
   - Use the ProcessPdfsModal component to test PDF processing
   - Check that PDFs are correctly processed and stored in Firestore
   - Verify that the chatbot can retrieve and respond to queries about the PDF content

4. **Troubleshooting**:
   - If PDF processing fails, check the console logs for detailed error messages
   - Verify that the OpenAI API key is valid and has sufficient credits
   - Ensure Firebase Storage CORS is correctly configured
   - Check that the storage rules allow access to the PDF files

## Additional Requirements

### Privacy Policy
- Required for both app stores and Firebase
- Must cover:
  - Data collection and usage
  - User rights and consent
  - Contact information
  - Cookie policy
  - GDPR compliance

### App Store Assets
1. **iOS Requirements**:
   - App icon (1024x1024)
   - Screenshots for:
     - iPhone 6.5" Display
     - iPhone 5.5" Display
     - iPad 12.9" Display
   - App description
   - Keywords for search

2. **Android Requirements**:
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Screenshots for:
     - Phone (3-8 screenshots)
     - 7-inch tablet
     - 10-inch tablet
   - App description
   - Short description (80 characters)

## Important Notes

- Keep all credentials and keystore files secure
- Document all account recovery emails and backup contacts
- Make sure all accounts are set up with company email addresses
- Consider Firebase and OpenAI pricing tiers based on expected usage
- The app uses a modern orange-based color scheme (#FF9800 as primary color)

## License

 2025 AstroNexAI. All rights reserved.
This software is licensed to AstroNexAI and may not be copied, modified, or distributed without express written permission.
