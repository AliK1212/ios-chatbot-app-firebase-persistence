# Scripts Directory

This directory contains utility scripts that were previously used for Firebase configuration and iOS build fixes.

## Note on Deprecated Scripts

The following scripts are no longer needed and have been replaced by the `expo-build-properties` plugin configuration in `app.config.js`:

- `fix-firebase-swift.js`
- `fix-swift-interface.js`
- `copy-swift-config.js`
- `fix-ios-pods.js`
- `fix-firebase-pods.js`
- `fix-script-permissions.js`
- `clean-cocoapods-cache.js`
- `update-cocoapods-repos.js`
- `prepare-eas-build.js`

These scripts were previously used to fix various Firebase Auth Swift module issues in iOS builds, but they have been replaced with a more standard approach using Expo's official plugins.

## Current Configuration

The app now uses:

1. `expo-build-properties` plugin with `useFrameworks: "static"` for iOS
2. `@react-native-firebase/app` plugin for Firebase configuration
3. Standard EAS build processes without custom prebuild commands

This simplifies the build process and follows recommended practices for React Native + Firebase integration.
