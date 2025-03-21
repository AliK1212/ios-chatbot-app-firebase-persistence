# EAS Build Commands

This document provides all the necessary commands to build your app with EAS.

## Prerequisites

Before starting, make sure you have:

1. Installed the EAS CLI: `npm install -g eas-cli`
2. Logged in to your Expo account: `npx eas login`
3. Configured your app in app.config.js
4. Updated eas.json with your specific build configurations

## Running Common Build Commands

### iOS Builds

#### Development Build (for testing on simulator)

```bash
npx eas build --profile preview --platform ios
```

#### Production Build (for App Store)

```bash
npx eas build --platform ios --profile production
```

### Android Builds 

#### Development Build (for testing on emulator)

```bash
npx eas build --profile preview --platform android
```

#### Production Build (for Google Play)

```bash
npx eas build --platform android --profile production
```

## Build Options

You can add these flags to your build commands:

- `--auto-submit` - Automatically submit to App Store/Play Store
- `--non-interactive` - Run in CI environments without prompts
- `--no-wait` - Start the build and exit (don't wait for completion)
- `--clear-cache` - Clear EAS cache before building

## Troubleshooting

If you encounter build errors:

1. Check the build logs for detailed error messages
2. Verify your app.config.js and eas.json are properly configured
3. See BUILD_ISSUES_FIXED.md for solutions to common issues
4. For Firebase Auth related issues, see FIREBASE_AUTH_FIX.md

## Environment Variables

You don't need to set environment variables manually as they are already configured in the eas.json file. Review them there if you need to make changes.

## Helpful Resources

- [EAS Build documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect API keys setup](https://docs.expo.dev/app-signing/app-credentials/#app-store-connect-api-keys)
