import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV || 'production';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://linknpark.onrender.com';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LinkNPark',
  slug: 'StickerOS',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: 'linknpark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#06090F',
  },
  updates: {
    url: "https://u.expo.dev/e0f55a41-94cf-42a2-99f1-de78d8298f8f"
  },
  runtimeVersion: '1.0.0',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.linknpark.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#06090F',
    },
    package: 'com.linknpark.app',
    googleServicesFile: './google-services.json',
    config: {
      googleMaps: {
        apiKey: 'AIzaSyAw668SqSxSTsYwZ8vwYmm_oWfbPEpyebs'
      }
    },
    versionCode: 3,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.NFC',
      'android.permission.VIBRATE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    [
      'expo-camera',
      { cameraPermission: 'LinkNPark needs camera access to scan sticker QR codes' },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'LinkNPark needs access to your photos so you can attach photo evidence to reports.',
        cameraPermission: 'LinkNPark needs camera access so you can take photo evidence for reports.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#2CFF05',
        androidMode: 'default',
        androidCollapsedTitle: 'LinkNPark Alert',
        sounds: ['./assets/alert_sound.wav'],
      },
    ],
    [
      'expo-truecaller',
      {
        androidClientId: 'ut7yqtyuuc6dwiyfjk1u_4hnlhuspwbhr-4qr0sp0pe'
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ]
  ],
  extra: {
    apiUrl: API_URL,
    appEnv: APP_ENV,
    eas: {
      projectId: 'e0f55a41-94cf-42a2-99f1-de78d8298f8f',
    },
  },
});
