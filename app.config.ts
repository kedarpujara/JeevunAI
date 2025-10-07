// app.config.ts (root)
// app.config.ts
import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'Quill';
const SLUG = 'quillai';

const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const EXPO_PUBLIC_USE_LOCAL_FUNCTIONS = process.env.EXPO_PUBLIC_USE_LOCAL_FUNCTIONS || '0';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,
  icon: './assets/images/quill_logo.png',
  scheme: 'quill',  
  version: '1.0.1',  
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    bundleIdentifier: 'com.kedarpujara.quill',
    supportsTablet: true,
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false, 
      NSCameraUsageDescription: 'Quill needs camera access to let you add images from your camera to your journal entries.',
      NSMicrophoneUsageDescription: 'Quill uses your microphone to record voice notes.',
      NSPhotoLibraryUsageDescription: 'Quill needs photo access to let you add images from your photo library to your journal entries.',
      NSLocationWhenInUseUsageDescription: 'Quill can tag entries with your location.',
      UIViewControllerBasedStatusBarAppearance: false,
      UIStatusBarStyle: 'UIStatusBarStyleDefault',
      NSFaceIDUsageDescription: "Use Face ID to quickly access and securely unlock your journal",
      NSUserNotificationUsageDescription: 'Quill uses notifications to remind you to journal.',
    },
  },

  android: {
    package: 'com.kedarpujara.quill',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
  },
  androidStatusBar: {
    barStyle: 'dark-content',
    backgroundColor: '#ffffff',
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    // ✅ This plugin wires up the entry automatically
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-av',
    'expo-sqlite',
    'expo-secure-store',   
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {
      // ✅ Tell expo-router where your routes live
      appRoot: 'app',
    },
    eas: {
      projectId: "6317edcc-cf51-4e87-8c29-696b54aaaf9a"
    },

    // Public runtime vars
    EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_USE_LOCAL_FUNCTIONS,
  },
};

export default config;