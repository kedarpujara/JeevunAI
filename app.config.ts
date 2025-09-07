// app.config.ts (root)
// app.config.ts
import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'Jeevun';
const SLUG = 'jeevunai';

const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const EXPO_PUBLIC_USE_LOCAL_FUNCTIONS = process.env.EXPO_PUBLIC_USE_LOCAL_FUNCTIONS || '0';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,

  scheme: 'jeevun',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    bundleIdentifier: 'com.kedarpujara.jeevun',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'Jeevun needs camera access to attach photos to your entries.',
      NSMicrophoneUsageDescription: 'Jeevun uses your microphone to record voice notes.',
      NSPhotoLibraryUsageDescription: 'Allow Jeevun to access your photos to attach images.',
      NSLocationWhenInUseUsageDescription: 'Jeevun can tag entries with your location.',
      UIViewControllerBasedStatusBarAppearance: false,
      UIStatusBarStyle: 'UIStatusBarStyleDefault',
      NSFaceIDUsageDescription: "Use Face ID to quickly access your journal entries",
    },
  },

  android: {
    package: 'com.kedarpujara.jeevun',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
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
      projectId: "e0161090-b383-4c9b-a241-8a2f4b7b2bd4"
    },

    // Public runtime vars
    EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_USE_LOCAL_FUNCTIONS,
  },
};

export default config;