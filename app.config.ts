import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV || 'local';
const IS_PROD = APP_ENV === 'production';
const IS_LOCAL = APP_ENV === 'local';

// When running locally, the app needs your machine's LAN IP to reach localhost:3001
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Or set LOCAL_API_IP env var before running: set LOCAL_API_IP=192.168.1.5
const LOCAL_IP = process.env.LOCAL_API_IP || 'localhost';

const API_URLS: Record<string, string> = {
  local: `http://${LOCAL_IP}:3001`,
  staging: 'https://linknpark-staging.onrender.com',
  production: 'https://linknpark.onrender.com',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PROD ? 'LinkNPark' : IS_LOCAL ? 'LinkNPark (Dev)' : 'LinkNPark (Test)',
  slug: 'StickerOS',
  version: '1.0.0',
  orientation: 'portrait',
  icon: IS_PROD ? './assets/icon.png' : './assets/icon-dev.png',
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
  runtimeVersion: {
    policy: "appVersion"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_PROD ? 'com.linknpark.app' : 'com.linknpark.app.staging',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: IS_PROD ? './assets/adaptive-icon.png' : './assets/adaptive-icon-dev.png',
      backgroundColor: IS_PROD ? '#06090F' : '#2A2A35',
    },
    package: IS_PROD ? 'com.linknpark.app' : 'com.linknpark.app.staging',
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
      'expo-notifications',
      {
        icon: IS_PROD ? './assets/icon.png' : './assets/icon-dev.png',
        color: '#2CFF05',
        androidMode: 'default',
        androidCollapsedTitle: IS_PROD ? 'LinkNPark Alert' : 'LinkNPark (Dev)',
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
    // Read in app via Constants.expoConfig.extra.apiUrl
    apiUrl: API_URLS[APP_ENV] || API_URLS.local,
    appEnv: APP_ENV,
    eas: {
      projectId: 'e0f55a41-94cf-42a2-99f1-de78d8298f8f',
    },
  },
});
