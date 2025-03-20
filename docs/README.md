# Safe HMO Mobile App

A professional mobile application for managing HMO properties and documentation, built with React Native and Expo.

## Features

- **PDF Chat Assistant**: AI-powered document analysis for HMO regulations and requirements using OpenAI
- **User Authentication**: Secure Firebase-based authentication system
- **Consultation Requests**: Form for users to request professional consultations
- **User Profiles**: Personalized user experience with profile management

## Technical Stack

- **Frontend**: React Native with Expo
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage
- **AI Integration**: OpenAI for natural language processing and vector search
- **UI Components**: Custom components with Lucide React Native icons
- **Navigation**: Expo Router

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Expo CLI
- OpenAI API key
- Firebase project

## Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Environment Variables:
Copy the `.env.example` file to `.env` and fill in your credentials:
```
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

3. Firebase Configuration:
- The app uses Firebase for authentication and data storage
- For production, update the `.env` file with your production Firebase credentials

## Running the App

```bash
npx expo start
```

This will start the Expo development server. You can then run the app on:
- iOS Simulator (press 'i')
- Android Emulator (press 'a')
- Physical device using the Expo Go app

## PDF Document Processing

To process and upload PDF documents for the chatbot:

1. Place your PDF files in the `documents` directory
2. Update the document metadata in `scripts/uploadPdfs.js`
3. Run the upload script:

```bash
node scripts/uploadPdfs.js
```

## Production Deployment

### iOS Deployment

1. Configure your Apple Developer account in App Store Connect
2. Set up your app identifier and provisioning profiles
3. Build the production IPA:

```bash
eas build --platform ios --profile production
```

4. Submit to App Store:

```bash
eas submit --platform ios
```

### Android Deployment

1. Configure your Google Play Console account
2. Generate a signed Android App Bundle:

```bash
eas build --platform android --profile production
```

3. Submit to Google Play:

```bash
eas submit --platform android
```

## Security Considerations

- API keys should never be hardcoded in the app
- Use environment variables for all sensitive credentials
- Implement proper Firebase security rules for data protection
- Enable app-level authentication for all API requests

## Related Documentation

- HANDOVER_CHECKLIST.md - Client handover requirements
- DEPLOYMENT_REQUIREMENTS.md - Required accounts and credentials
- PRODUCTION_CHECKLIST.md - Production deployment checklist
- FINAL_DEPLOYMENT_CHECKLIST.md - Detailed technical deployment steps
- BRANDING_GUIDE.md - UI design specifications and guidelines for the new orange-based palette

## License

 2025 AstroNexAI. All rights reserved.
This software is licensed to AstroNexAI and may not be copied, modified, or distributed without express written permission.
