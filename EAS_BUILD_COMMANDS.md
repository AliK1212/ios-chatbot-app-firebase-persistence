# EAS Build Commands

This document provides the exact commands to run for different build scenarios.

## Prerequisites

Make sure you're logged into EAS:

```bash
npx eas login
```

## iOS Simulator Build (Preview)

For testing on iOS simulator (fastest way to test):

```bash
npx eas build --profile preview --platform ios
```

This will:
- Build for iOS simulator
- Use debug configuration
- Automatically increment build number
- Use environment variables from the preview profile

## iOS App Store Build (Production)

For submitting to App Store:

```bash
npx eas build --profile production --platform ios
```

This will:
- Build for real iOS devices
- Use release configuration
- Automatically increment build number
- Use environment variables from the production profile

## Check Build Status

To see the status of your builds:

```bash
npx eas build:list
```

## Submit to App Store

After a successful production build:

```bash
npx eas submit --platform ios
```

## Additional Commands

### Clean build cache (if facing build issues):

```bash
npx eas build --profile production --platform ios --clear-cache
```

### Configure EAS for your project:

```bash
npx eas build:configure
```

### Validate app config:

```bash
npx expo config --type prebuild
```
