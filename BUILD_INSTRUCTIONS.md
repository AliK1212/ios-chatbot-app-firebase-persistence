# Build Instructions for Safe HMO

This document outlines the simplified build process for the Safe HMO app.

## Prerequisites

1. An Expo account (create one at https://expo.dev/signup)
2. EAS CLI installed globally: `npm install -g eas-cli`
3. Logged into EAS: `eas login`

## iOS Build Process

### Preview Build (Simulator)

To create a preview build for iOS simulator testing:

```bash
npm run preview
```

This will:
- Create an iOS build with the "preview" profile
- Target the iOS simulator
- Use debug configuration
- Automatically increment the build number

### Production Build (App Store)

To create a production build for App Store submission:

```bash
npm run build:ios
```

This will:
- Create an iOS build with the "production" profile
- Target actual devices
- Use release configuration
- Automatically increment the build number
- Use your stored App Store credentials

## App Configuration

The app is configured using:

1. `app.config.js` - Contains all Expo configuration including:
   - Firebase plugin configuration
   - expo-build-properties plugin with static frameworks for iOS

2. `eas.json` - Contains EAS-specific build configurations:
   - Development, preview, and production profiles
   - Environment variables
   - Build settings like auto-incrementing version numbers
   - App Store submission configuration

## Firebase Configuration

Firebase is now configured using the standard Expo approach:

1. The `@react-native-firebase/app` plugin in `app.config.js`
2. The `GoogleService-Info.plist` file at the project root
3. Static frameworks approach via the `expo-build-properties` plugin

No custom script modifications are needed anymore.

## Troubleshooting

If you encounter build issues:

1. Run `npx expo-doctor` to check for compatibility issues
2. Ensure your EAS account has the correct iOS credentials configured
3. Make sure the `GoogleService-Info.plist` file is correctly placed at the project root

For more help, see the [EAS Build documentation](https://docs.expo.dev/build/introduction/).
