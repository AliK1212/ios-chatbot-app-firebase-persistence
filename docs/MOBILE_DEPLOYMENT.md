# Mobile Deployment Guide for Safe HMO App

This guide provides specific instructions for deploying the Safe HMO PDF Chatbot application to iOS and Android platforms.

## PDF Processing on Mobile

The application has been enhanced to support PDF processing on mobile platforms with the following features:

1. **Buffer Polyfill**: A custom implementation that works in both browser and React Native environments
2. **Platform Detection**: Automatic detection of the runtime environment (Web, iOS, Android)
3. **Fallback Mechanisms**: Alternative processing methods when native libraries aren't available
4. **Memory Optimization**: Efficient handling of PDF data to prevent memory issues on mobile devices

## OpenAI Integration

The application uses OpenAI for generating embeddings and chat responses. Key points:

1. **API Key Management**: The OpenAI API key is managed through the `set-openai-key.js` script
2. **Error Handling**: Robust error handling for API failures
3. **Token Usage Logging**: Tracking of token usage for cost management
4. **Embedding Generation**: Optimized for mobile environments

## iOS Deployment Requirements

### Apple Developer Account

1. **Account Type**: You need an Apple Developer Program account ($99/year)
2. **App ID**: Create an App ID in the Apple Developer Portal
3. **Certificates**: Generate and install necessary certificates
4. **Provisioning Profiles**: Create and configure provisioning profiles

### App Store Connect

1. **Create App**: Set up your app in App Store Connect
2. **App Information**: Prepare app metadata, screenshots, and descriptions
3. **App Review Guidelines**: Ensure compliance with [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Build Configuration

1. **Bundle Identifier**: Update in `app.json` (currently set to `com.safehmo.app`)
2. **Version and Build Number**: Update in `app.json`
3. **Icons and Splash Screens**: Ensure all required sizes are provided
4. **Info.plist Settings**: Review permissions in `app.json` under `ios.infoPlist`

## Android Deployment Requirements

### Google Play Developer Account

1. **Account Setup**: Create a Google Play Developer account ($25 one-time fee)
2. **App Creation**: Set up your app in the Google Play Console
3. **Content Rating**: Complete the content rating questionnaire
4. **Store Listing**: Prepare app metadata, screenshots, and descriptions

### Build Configuration

1. **Package Name**: Update in `app.json` (currently set to `com.safehmo.app`)
2. **Version Code and Name**: Update in `app.json`
3. **Icons**: Ensure adaptive icons are properly configured
4. **Permissions**: Review permissions in `app.json` under `android.permissions`

## Building for Production

### Prerequisites

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

### iOS Build

1. Configure your Apple credentials:
   ```bash
   eas credentials
   ```

2. Build for production:
   ```bash
   eas build --platform ios --profile production
   ```

3. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

### Android Build

1. Configure your Android credentials:
   ```bash
   eas credentials
   ```

2. Build for production:
   ```bash
   eas build --platform android --profile production
   ```

3. Submit to Google Play:
   ```bash
   eas submit --platform android
   ```

## Testing on Physical Devices

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

## Troubleshooting Mobile-Specific Issues

### PDF Processing

If PDF processing fails on mobile:

1. Check that the Buffer polyfill is working correctly
2. Verify that the PDF extraction method is appropriate for the platform
3. Test with smaller PDFs to rule out memory issues
4. Check console logs for specific error messages

### OpenAI API

If OpenAI API calls fail:

1. Verify the API key is correctly set using `npm run set:openai-key`
2. Check network connectivity on the device
3. Verify the API endpoint is accessible from the device
4. Test with simple queries to isolate the issue

### File Picking

If document selection fails:

1. Verify permissions are correctly set in `app.json`
2. Check that the Expo Document Picker is properly configured
3. Test with different file types and sizes
4. Verify storage access permissions on the device

## Additional Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Firebase Documentation](https://firebase.google.com/docs)
