import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './usePushNotifications';

const TOKEN_STORE_KEY = 'expo_push_token';
const EAS_PROJECT_ID = 'e0f55a41-94cf-42a2-99f1-de78d8298f8f';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('incidents_v2', {
      name: 'Incident Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2CFF05',
      sound: 'alert_sound',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return token;
  } catch (e) {
    console.warn('[PushToken] Could not get token:', e);
    return null;
  }
}

export function usePushToken(userEmail: string | null) {
  useEffect(() => {
    if (!userEmail) return;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (!token) return;

        const stored = Platform.OS === 'web' 
          ? localStorage.getItem(TOKEN_STORE_KEY) 
          : await SecureStore.getItemAsync(TOKEN_STORE_KEY);
        if (stored === token) return;

        const authToken = Platform.OS === 'web'
          ? localStorage.getItem('linknpark_auth_token')
          : await SecureStore.getItemAsync('linknpark_auth_token');
        if (!authToken) return;

        const res = await fetch(`${API_BASE}/api/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_STORE_KEY, token);
          } else {
            await SecureStore.setItemAsync(TOKEN_STORE_KEY, token);
          }
          console.log('[PushToken] Registered:', token.slice(0, 30) + '…');
        }
      } catch (e) {
        console.warn('[PushToken] Registration failed:', e);
      }
    })();
  }, [userEmail]);
}
