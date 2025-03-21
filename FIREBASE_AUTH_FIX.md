# Firebase Auth Swift Interface Verification Fix

This document outlines the fixes implemented to resolve the Firebase Auth Swift module interface verification error in the iOS build.

## Problem

The build process was encountering errors related to the FirebaseAuth module, specifically:
- "no such module 'FirebaseAppCheckInterop'"
- "failed to verify module interface of 'FirebaseAuth'"

## Solution

We implemented a comprehensive solution to fix these issues:

### 1. Podfile Template Updates

- Added `use_modular_headers!` to ensure modular headers are used
- Set `$RNFirebaseAsStaticFramework = true` to use Firebase as static frameworks
- Explicitly included the FirebaseAuth pod with modular headers: `pod 'FirebaseAuth', :modular_headers => true`
- Added explicit dependencies for FirebaseAuth:
  ```ruby
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'GTMSessionFetcher', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
  ```
- Implemented a post-install hook to set Swift-related build settings for Firebase targets:
  ```ruby
  config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
  config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
  config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
  config.build_settings['DEFINES_MODULE'] = 'YES'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  ```
- Added a Swift module interface verification fix to apply settings to all pods:
  ```ruby
  if has_swift_module_fix
    installer.pods_project.build_configurations.each do |config|
      config.build_settings.merge!(YAML.load_file('SwiftModuleFix.xcconfig'))
    end
  end
  ```
- Made the SwiftModuleFix.xcconfig import conditional to prevent build errors:
  ```ruby
  swift_module_fix_path = 'SwiftModuleFix.xcconfig'
  has_swift_module_fix = File.exist?(File.join(__dir__, swift_module_fix_path))
  ```

### 2. Scripts Created/Updated

- **fix-firebase-swift.js**: 
  - Ensures the Podfile has all necessary Firebase configurations 
  - Updates `firebase.json` to include `"modular_headers": true`
  - Creates SwiftModuleFix.xcconfig in both project root and iOS directory
- **fix-swift-interface.js**: 
  - Adds specific fixes for Swift module interface verification issues
  - Creates SwiftModuleFix.xcconfig in both project root and iOS directory
- **copy-swift-config.js**: 
  - Copies the SwiftModuleFix.xcconfig file to the iOS directory during prebuild

### 3. Configuration Files Created

- **SwiftModuleFix.xcconfig**: Contains Swift-specific build settings to fix module interface verification:
  ```
  SWIFT_COMPILATION_MODE = wholemodule
  SWIFT_OPTIMIZATION_LEVEL = -Onone
  BUILD_LIBRARY_FOR_DISTRIBUTION = YES
  DEFINES_MODULE = YES
  SWIFT_VERSION = 5.0
  ```
- **Podfile.properties.json**: Sets `useModularHeaders: true` and iOS deployment target

### 4. Package.json Updates

- Updated the `postinstall` script to include all fix scripts
- Updated the `prebuild:ios` script to run all fix scripts before generating native code

### 5. Prebuild Hook Updates

- Updated `prebuild.js` to run all fix scripts during iOS builds
- Added code to create necessary configuration files and update the Podfile

## Usage

### Local Development

When building the iOS app locally, these fixes will be automatically applied through the prebuild process. The scripts ensure that all necessary configurations are in place before CocoaPods installs the dependencies.

To manually apply the fixes, you can run:
```bash
node scripts/fix-firebase-swift.js
node scripts/fix-swift-interface.js
```

### EAS Build

For EAS builds, we've updated the eas.json configuration to automatically run the fix scripts during the build process:

```json
{
  "build": {
    "preview": {
      "ios": {
        "simulator": true,
        "buildConfiguration": "Debug",
        "resourceClass": "m-medium",
        "prebuildCommand": "node scripts/fix-firebase-swift.js && node scripts/fix-swift-interface.js && node scripts/copy-swift-config.js && npx expo prebuild --platform ios"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "prebuildCommand": "node scripts/fix-firebase-swift.js && node scripts/fix-swift-interface.js && node scripts/copy-swift-config.js && npx expo prebuild --platform ios",
        "distribution": "store",
        "credentialsSource": "remote"
      }
    }
  }
}
```

To build the app using EAS, run:

```bash
# For development/testing
npx eas build --platform ios --profile preview

# For production
npx eas build --platform ios --profile production
```

## Compatibility

These fixes are designed to work with:
- React Native 0.74+
- Firebase SDK 10.0.0+
- Expo SDK 49.0.3+

## References

- [Firebase Auth documentation](https://firebase.google.com/docs/auth)
- [React Native Firebase documentation](https://rnfirebase.io/)
- [CocoaPods Modular Headers documentation](https://guides.cocoapods.org/syntax/podfile.html#use_modular_headers_bang)
