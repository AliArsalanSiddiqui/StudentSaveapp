// app.config.js
export default {
  expo: {
    name: "StudentSave",
    slug: "studentsave",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "studentsave",

    splash: {
      image: "./assets/splash-icon.png",
      backgroundColor: "#1e1b4b",
      resizeMode: "contain"
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.studentsave.app",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSCameraUsageDescription: "This app needs camera access to scan QR codes for discount redemption.",
        NSPhotoLibraryUsageDescription: "This app needs photo library access to upload student ID verification documents.",
        NSMicrophoneUsageDescription: "This app needs microphone access for audio features such as QR scanning with audio or future voice-enabled functionality.",
        NSLocationWhenInUseUsageDescription: "StudentSave uses your location to show nearby vendors and filter discounts in your area.",
        ITSAppUsesNonExemptEncryption: false
      }
    },

    android: {
      package: "com.studentsave.app",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#1e1b4b",
        foregroundImage: "./assets/icon.png"
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.VIBRATE",
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ],
      googleServicesFile: "./google-services.json"
    },

    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },

    plugins: [
      "expo-router",
      [
        "expo-camera",
        { cameraPermission: "Allow StudentSave to access your camera to scan QR codes" }
      ],
      [
        "expo-image-picker",
        { photosPermission: "Allow StudentSave to access your photos to upload student ID" }
      ],
      "expo-asset",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#c084fc"
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      router: { origin: false },
      eas: {
        projectId: "75a5ca88-15e2-4e62-81ff-5da6d6d3ada6"
      }
    },

    owner: "studentsaves-organization",

    runtimeVersion: {
      policy: "appVersion"
    },

    updates: {
      url: "https://u.expo.dev/75a5ca88-15e2-4e62-81ff-5da6d6d3ada6"
    }
  }
};