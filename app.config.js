// Define the entire configuration in app.config.js
// No need to import from app.json anymore
export default {
  expo: {
    name: "Safe HMO",
    slug: "safe-hmo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/square/app-icon.png", // Using favicon as a temporary square icon
    userInterfaceStyle: "light",
    scheme: "safehmo",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/safe-logo-.png",
      resizeMode: "contain",
      backgroundColor: "#0B4E83"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.safehmo.app",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan documents and allow users to take profile pictures.",
        NSPhotoLibraryUsageDescription: "This app uses the photo library to allow users to select documents and profile pictures.",
        NSPhotoLibraryAddUsageDescription: "This app needs access to save documents to your photo library.",
        NSDocumentsFolderUsageDescription: "This app needs access to your documents folder to select PDF files.",
        UIBackgroundModes: ["fetch", "remote-notification"],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        },
        ITSAppUsesNonExemptEncryption: false
      },
      associatedDomains: ["applinks:safehmo.com"]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/square/app-icon.png", 
        backgroundColor: "#0B4E83"
      },
      package: "com.safehmo.app",
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "safehmo.com",
              pathPrefix: "/"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    plugins: [
      "expo-router",
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "99f6a3ab-5cf1-4f73-83fd-597088cbaf16"
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || ""
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || "",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || "",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
      }
    }
  }
};
