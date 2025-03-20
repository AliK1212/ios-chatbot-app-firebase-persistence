# PDF Chatbot Mobile Application

A powerful mobile chatbot application that allows users to interact with PDF documents through natural language queries. The application extracts text from PDFs, generates embeddings using OpenAI, and provides relevant answers based on document content.

## Key Features

- PDF document processing and text extraction
- Vector search for finding relevant content based on user queries
- OpenAI integration for generating embeddings and chat responses
- Native mobile experience for iOS and Android
- Firebase integration for document storage and retrieval

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- Firebase account
- OpenAI API key
- Expo account (https://expo.dev)
- For mobile deployment:
  - Apple Developer account (for iOS)
  - Google Play Developer account (for Android)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` in the project root
3. Update the `.env` file with your Firebase and OpenAI credentials

### ⚠️ OpenAI API Key Setup (Required)

The application requires a valid OpenAI API key to function properly. Without this key, PDF processing and chatbot functionality will not work.

1. Create an account at [OpenAI](https://platform.openai.com/) if you don't have one
2. Generate an API key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Add your API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key
   ```

Alternatively, you can use the provided script to set your OpenAI API key:
```
npm run set:openai-key
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore and Storage services
3. Update the `.env` file with your Firebase credentials
4. Deploy Firestore security rules from `firestore-rules.txt`

## Mobile Deployment

This application is designed exclusively for mobile deployment on iOS and Android platforms. Follow these steps to build and deploy the app:

### iOS Deployment

1. Ensure you have an Apple Developer account
2. Configure your app in app.json:
   - Update the bundleIdentifier
   - Set the appropriate permissions
   - Configure your build settings

3. Build for iOS:
   ```bash
   eas build --platform ios --profile production
   ```

4. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

### Android Deployment

1. Ensure you have a Google Play Developer account
2. Configure your app in app.json:
   - Update the package name
   - Set the appropriate permissions
   - Configure your build settings

3. Build for Android:
   ```bash
   eas build --platform android --profile production
   ```

4. Submit to Google Play:
   ```bash
   eas submit --platform android
   ```

For more detailed deployment instructions, see the [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) in the docs folder.

## Testing on Physical Devices

### Development Builds

1. Create a development build:
   ```
   eas build --profile development --platform ios
   # or
   eas build --profile development --platform android
   ```

2. Install the development build on your device using the QR code or link provided by EAS Build

3. Start the development server:
   ```
   npm run dev
   ```

4. Open the development build on your device and connect to the development server

## Troubleshooting

### OpenAI API Errors

If you encounter errors related to OpenAI API calls:

1. Verify your API key is correctly set in the `.env` file
2. Check that your OpenAI account has sufficient credits
3. Ensure you're using a supported model in the configuration

### PDF Processing Issues

If PDF processing fails:

1. Check that your PDFs are not corrupted or password-protected
2. Verify that Firebase Storage permissions are correctly set
3. Check the console logs for specific error messages

### Mobile Build Issues

If you encounter issues with EAS Build:

1. Ensure you have the latest EAS CLI installed
2. Verify your Expo account has access to EAS Build
3. Check that your app.json and eas.json files are correctly configured
4. For iOS builds, ensure your Apple Developer account is active and has the necessary certificates
5. For Android builds, ensure your Google Play Developer account is active and properly set up

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
