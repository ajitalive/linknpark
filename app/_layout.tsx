import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { warmupServer } from '../hooks/useApi';

// Ping Render immediately so it's warm by the time auth requests go out
warmupServer();

// Show alerts + play sound + show badge when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // When user taps a push notification, navigate to the incident
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.reportId) {
        router.push(`/incident/${data.reportId}` as any);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sticker/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="incident/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="activate" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="guard" options={{ presentation: 'card' }} />
          <Stack.Screen name="sos-settings" options={{ presentation: 'card' }} />
          <Stack.Screen name="emergency-contacts" options={{ presentation: 'card' }} />
          <Stack.Screen name="guardian-network" options={{ presentation: 'card' }} />
          <Stack.Screen name="parking-timer" options={{ presentation: 'card' }} />
          <Stack.Screen name="notification-preferences" options={{ presentation: 'card' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
