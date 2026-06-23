import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
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

function handleDeepLink(url: string) {
  // linknpark://report?plate=KA01AB1234&code=STKCODE
  const parsed = Linking.parse(url);
  if (parsed.path === 'report' || parsed.hostname === 'report') {
    const plate = parsed.queryParams?.plate as string | undefined;
    const code = parsed.queryParams?.code as string | undefined;
    if (plate || code) {
      router.push({ pathname: '/report/[plate]', params: { plate: plate || '', code: code || '' } } as any);
    }
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Handle deep links when app is already open
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Handle deep link that cold-started the app
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });

    // When user taps a push notification, navigate to the incident
    const notifSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.reportId) {
        router.push(`/incident/${data.reportId}` as any);
      }
    });
    return () => {
      linkSub.remove();
      notifSub.remove();
    };
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
          <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="checkout/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="activate" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="guard" options={{ presentation: 'card' }} />
          <Stack.Screen name="etag" options={{ presentation: 'card' }} />
          <Stack.Screen name="report-vehicle" options={{ presentation: 'card' }} />
          <Stack.Screen name="safety-radar" options={{ presentation: 'card' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
          <Stack.Screen name="sos-settings" options={{ presentation: 'card' }} />
          <Stack.Screen name="emergency-contacts" options={{ presentation: 'card' }} />
          <Stack.Screen name="guardian-network" options={{ presentation: 'card' }} />
          <Stack.Screen name="parking-timer" options={{ presentation: 'card' }} />
          <Stack.Screen name="notification-preferences" options={{ presentation: 'card' }} />
          <Stack.Screen name="report/[plate]" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
