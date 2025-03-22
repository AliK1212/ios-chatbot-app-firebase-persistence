# Development Build Instructions for iOS Devices

This guide explains how to create and install a development build of the app on physical iOS devices.

## Prerequisites

Before starting, ensure you have:

1. An Apple Developer account
2. Your iOS device's UDID added to your Apple Developer account
3. A provisioning profile with your device included
4. Expo CLI installed (`npm install -g eas-cli`)

## Creating an iOS Development Build

### Step 1: Build the Development Client

Run the following command to create a development build:

```bash
npm run build:ios:dev
# Or directly:
# npx eas build --platform ios --profile development
```

This will start the build process using EAS Build. The build profile is configured with:
- Development client enabled
- Internal distribution
- Remote credentials source

### Step 2: Install on Your Device

Once the build is complete, you have two options:

#### Option A: Install via QR Code (Easiest)

1. When the build completes, EAS will provide a QR code and URL
2. On your iOS device, open the camera app and scan the QR code
3. Follow the instructions to install the app

#### Option B: Install via Email or Link

1. Share the installation link provided by EAS with yourself
2. Open the link on your iOS device
3. Follow the instructions to install the app

### Step 3: Launching the Development Build

1. Make sure your development server is running on your computer:
   ```bash
   npm run dev
   ```

2. Open the installed app on your device
3. Shake your device or use three-finger swipe down to open the developer menu
4. Choose "Connect to development server"
5. Enter your computer's IP address and port (usually displayed in the terminal)

## Troubleshooting

### If the app doesn't install:

1. Verify your device's UDID is registered in your Apple Developer account
2. Check that your provisioning profile includes your device
3. Make sure you're using the latest version of iOS

### If the app can't connect to the development server:

1. Ensure your device and computer are on the same network
2. Check if any firewall is blocking the connection
3. Try entering the full URL including the protocol (e.g., `http://192.168.1.5:8081`)

## Additional Resources

- [Expo Documentation: iOS Development Build for Devices](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/)
- [Apple Developer: Managing Devices](https://developer.apple.com/help/account/register-devices/register-a-single-device/)
- [EAS Build Documentation](https://docs.expo.dev/build/setup/)
