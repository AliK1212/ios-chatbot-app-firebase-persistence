# Mobile Deployment Guide

This document provides detailed instructions for deploying the Safe HMO PDF Chatbot mobile application to iOS and Android platforms.

## Overview

The Safe HMO PDF Chatbot is designed exclusively as a mobile application for iOS and Android platforms. This guide will walk you through the process of preparing, building, and submitting the app to the Apple App Store and Google Play Store.

## Prerequisites

Before starting the deployment process, ensure you have the following:

1. **Expo Account**: Create or log in to your account at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install the EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
3. **Apple Developer Account**: Required for iOS deployment ($99/year)
4. **Google Play Developer Account**: Required for Android deployment ($25 one-time fee)
5. **Firebase Project**: Properly configured with Firestore and Storage
6. **OpenAI API Key**: Valid and with sufficient credits

## Project Configuration

### 1. Environment Variables

Ensure your `.env` file contains all required variables:

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

### 2. OpenAI API Key Setup

Since this is a mobile-only application and environment variables don't work reliably in the mobile environment, ensure your OpenAI API key is properly set using the provided script:

```bash
npm run set:openai-key
```

This will update the configuration file directly with your API key.

### 3. App Configuration

Review and update the `app.json` file with your app's information:

- App name
- Bundle/package identifiers
- Version numbers
- Icons and splash screens
- Required permissions for mobile functionality

## iOS Deployment

### 1. Apple Developer Account Setup

1. Log in to your [Apple Developer Account](https://developer.apple.com)
2. Create an App ID in Certificates, Identifiers & Profiles
3. Create a new app in [App Store Connect](https://appstoreconnect.apple.com)
4. Note your Team ID from the Membership section

### 2. EAS Configuration

1. Log in to EAS:
   ```bash
   eas login
   ```

2. Configure your project:
   ```bash
   eas build:configure
   ```

3. Update the `eas.json` file with your Apple credentials:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@example.com",
         "ascAppId": "your-app-store-connect-app-id",
         "appleTeamId": "your-apple-team-id"
       }
     }
   }
   ```

### 3. Build and Submit

1. Build the iOS app:
   ```bash
   eas build --platform ios --profile production
   ```

2. Once the build completes, submit to App Store:
   ```bash
   eas submit --platform ios
   ```

3. Complete the App Store submission in App Store Connect:
   - Add screenshots
   - Complete app metadata
   - Answer privacy questions
   - Set pricing and availability

## Android Deployment

### 1. Google Play Developer Console Setup

1. Log in to [Google Play Console](https://play.google.com/console)
2. Create a new application
3. Complete the store listing information
4. Create a service account for API access:
   - Go to Setup > API access
   - Create a new service account
   - Download the JSON key file

### 2. EAS Configuration

1. Save the service account JSON key file to your project
2. Update the `eas.json` file with the path to your service account key:
   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "path/to/google-play-service-account.json",
         "track": "production"
       }
     }
   }
   ```

### 3. Build and Submit

1. Build the Android app:
   ```bash
   eas build --platform android --profile production
   ```

2. Once the build completes, submit to Google Play:
   ```bash
   eas submit --platform android
   ```

3. Complete the Google Play submission:
   - Add screenshots and promotional graphics
   - Complete content rating questionnaire
   - Set up pricing and distribution

## Mobile-Specific Considerations

### PDF Processing on Mobile

The application has been specifically optimized for mobile PDF processing:

1. **Buffer Polyfill**: A custom implementation that works in React Native environments
2. **Platform Detection**: Automatic detection of iOS vs Android for optimal performance
3. **Memory Management**: Efficient handling of PDF data to prevent memory issues on mobile devices
4. **Fallback Mechanisms**: Alternative processing methods when native libraries aren't available

### OpenAI Integration for Mobile

The OpenAI integration has been optimized for mobile environments:

1. **API Key Management**: Direct configuration in the app for reliable mobile access
2. **Network Handling**: Robust error handling for mobile network conditions
3. **Token Usage Optimization**: Minimizing API calls to reduce data usage on mobile networks

## Testing on Physical Devices

### Development Builds

For testing on physical devices before production deployment:

1. Create a development build:
   ```bash
   eas build --profile development --platform ios
   # or
   eas build --profile development --platform android
   ```

2. Install the development build on your device using the QR code or link provided by EAS Build

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the development build on your device and connect to the development server

## Troubleshooting

### Common iOS Build Issues

1. **Provisioning Profile Errors**:
   - Ensure your Apple Developer account has the correct provisioning profiles
   - Try running `eas credentials` to manage credentials

2. **App Store Connect API Issues**:
   - Verify your App Store Connect API key is valid
   - Check that your Apple ID has the correct permissions

### Common Android Build Issues

1. **Keystore Issues**:
   - Let EAS manage your keystore for simplicity
   - If using your own keystore, ensure it's properly configured

2. **Google Play API Issues**:
   - Verify your service account has the correct permissions
   - Ensure the JSON key file is valid and accessible

## Post-Deployment

After successful deployment:

1. Monitor app performance using Firebase Analytics
2. Set up crash reporting with Firebase Crashlytics
3. Implement a feedback mechanism for users to report issues
4. Plan for regular updates to address bugs and add new features

## Additional Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/)
- [Firebase Documentation](https://firebase.google.com/docs)
