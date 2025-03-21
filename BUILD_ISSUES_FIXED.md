# EAS Build Issues Fixed

This document outlines the specific issues that were encountered during EAS builds and how they were resolved.

## 1. Native Directory Conflict with Prebuild

**Issue:**
Build failure due to mixed use of native directories (ios/android) and config-driven Prebuild:
```
This project contains native project folders but also has native configuration properties in app.config.js, 
indicating it is configured to use Prebuild. When the android/ios folders are present, 
EAS Build will not sync properties like: orientation, icon, splash, ios, android, plugins.
```

**Solution:**
1. Added `/ios/` and `/android/` to `.easignore` file to force EAS Build to regenerate these directories 
   during the build process, ensuring all app.config.js settings are properly applied
2. Added warnings in the prebuild script about existing native directories that might cause conflicts

## 2. GoogleService-Info.plist Path Issue

**Issue:**
Build error during prebuild phase:
```
Error: [ios.xcodeproj]: withIosXcodeprojBaseMod: Path to GoogleService-Info.plist is not defined. 
Please specify the `expo.ios.googleServicesFile` field in app.json.
```

**Solution:**
1. Moved the GoogleService-Info.plist path configuration from the Firebase plugin to the iOS config section:
   ```javascript
   ios: {
     supportsTablet: true,
     bundleIdentifier: "com.safehmo.app",
     googleServicesFile: "./GoogleService-Info.plist",
     // ...
   }
   ```
2. Simplified the Firebase plugin configuration
3. Added Android Firebase configuration with `google-services.json`

## 3. OpenAI patch-package Error

**Issue:**
Build failure during npm install with error:
```
**ERROR** Failed to apply patch for package openai at path
  node_modules/openai
This error was caused because patch-package cannot apply the following patch file:
  patches/openai+4.87.3.patch
```

**Solution:**
1. Removed the `postinstall` script that was running patch-package
2. Removed the patches directory entirely 
3. Created a better solution using a utility file:
   - Created `utils/openai-config.ts` through `fix-openai-browser.js`
   - This utility properly configures OpenAI with `dangerouslyAllowBrowser: true`
   - The environment variable `OPENAI_DANGEROUSLY_ALLOW_BROWSER` is set in EAS.json

## 4. Firebase Swift Module Configuration

**Issue:**
Previous complex setup with multiple scripts for Firebase configuration.

**Solution:**
1. Simplified Firebase setup using official plugins:
   - Added `@react-native-firebase/app` plugin in app.config.js
   - Configured `expo-build-properties` to use static frameworks
   - Created GoogleService-Info.plist file at the project root
   - Created google-services.json for Android

## 5. Build Configuration

**Updates:**
1. Simplified eas.json:
   - Added proper caching configuration
   - Set autoIncrement for automatic version handling
   - Configured proper resource classes for iOS builds
   - Added environment variables directly in the profiles

2. Updated build scripts:
   - Simplified the prebuild process
   - Created cleaner build scripts in package.json
   - Added hooks in app.config.js

## How to Build

With these fixes, you can now build your app with:

```bash
# For iOS simulator (testing)
npx eas build --profile preview --platform ios

# For App Store (production)
npx eas build --profile production --platform ios
```

See the `EAS_BUILD_COMMANDS.md` file for more details.
