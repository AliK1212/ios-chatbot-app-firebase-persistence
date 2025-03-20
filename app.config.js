export default {
  expo: {
    name: "Safe HMO",
    slug: "safe-hmo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/safe-logo.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.safehmo.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "This app needs access to the camera to scan documents.",
        NSPhotoLibraryUsageDescription: "This app needs access to photos for uploading HMO documents.",
        NSPhotoLibraryAddUsageDescription: "This app needs access to photos to save documents."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.safehmo.app",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production"
        }
      ]
    ],
    extra: {
      eas: {
        // projectId will be set by EAS init
      },
      openai: {
        apiKey: "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" // Replace with your actual OpenAI API key
      }
    }
  }
};
