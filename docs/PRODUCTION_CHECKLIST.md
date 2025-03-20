# Safe HMO App - Production Deployment Checklist

This checklist will help ensure your app is fully prepared for production deployment.

## API Keys and Environment Variables

- [ ] Create a production Firebase project
- [ ] Set up Firebase Authentication with proper security rules
- [ ] Obtain a production OpenAI API key
- [ ] Update the `.env` file with production credentials
- [ ] Verify all API keys are working correctly

## iOS Deployment Preparation

- [ ] Register for an Apple Developer Account ($99/year)
- [ ] Create an App ID in the Apple Developer Portal
- [ ] Generate necessary certificates and provisioning profiles
- [ ] Create an app listing in App Store Connect
- [ ] Prepare app screenshots in required dimensions
- [ ] Create a 1024x1024 app icon
- [ ] Write App Store description and keywords
- [ ] Prepare privacy policy URL

## Android Deployment Preparation

- [ ] Register for a Google Play Developer Account ($25 one-time fee)
- [ ] Create an app listing in the Google Play Console
- [ ] Prepare app screenshots in required dimensions
- [ ] Create a 512x512 app icon and 1024x500 feature graphic
- [ ] Write Play Store description and keywords
- [ ] Prepare privacy policy URL
- [ ] Set up app signing key

## Content and Features

- [ ] Upload all necessary PDF documents using the uploadPdfs.js script
- [ ] Test the chatbot with various queries to ensure it works correctly
- [ ] Verify consultation form submissions are properly stored in Firebase
- [ ] Test user authentication flow (signup, login, logout)
- [ ] Verify profile information is displayed correctly
- [ ] Test the app on both iOS and Android devices

## Build and Submission

### iOS

1. Build the production IPA:
```bash
eas build --platform ios --profile production
```

2. Submit to App Store:
```bash
eas submit --platform ios
```

### Android

1. Build the production AAB:
```bash
eas build --platform android --profile production
```

2. Submit to Google Play:
```bash
eas submit --platform android
```

## Important Notes

1. The OpenAI API key should be kept secure and not shared publicly.
2. Firebase security rules should be carefully configured to protect user data.
3. Regular backups of Firestore data are recommended.
4. The app uses a modern orange-based color scheme (#FF9800 as primary color).
5. Refer to the BRANDING_GUIDE.md for UI design specifications.

## Related Documentation

- README.md - Main project documentation
- HANDOVER_CHECKLIST.md - Client handover requirements
- DEPLOYMENT_REQUIREMENTS.md - Required accounts and credentials
- FINAL_DEPLOYMENT_CHECKLIST.md - Detailed technical deployment steps
- BRANDING_GUIDE.md - UI design specifications and guidelines

## License

 2025 AstroNexAI. All rights reserved.
This software is licensed to AstroNexAI and may not be copied, modified, or distributed without express written permission.
