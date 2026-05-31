import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_PROD = process.env.APP_ENV === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PROD ? 'LinkNPark' : 'LinkNPark (Test)',
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
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_PROD ? 'com.linknpark.app' : 'com.linknpark.app.staging',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#06090F',
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
        icon: './assets/icon.png',
        color: '#2CFF05',
        androidMode: 'default',
        androidCollapsedTitle: IS_PROD ? 'LinkNPark Alert' : 'LinkNPark (Test)',
      },
    ],
  ],
  extra: {
    // Read in app via Constants.expoConfig.extra.apiUrl
    apiUrl: IS_PROD
      ? 'https://linknpark.onrender.com'
      : 'https://linknpark-staging.onrender.com',
    appEnv: IS_PROD ? 'production' : 'staging',
    eas: {
      projectId: 'e0f55a41-94cf-42a2-99f1-de78d8298f8f',
    },
  },
});
