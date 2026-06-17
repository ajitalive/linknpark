import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReportSocket, ReportPayload } from '../../hooks/usePushNotifications';
import { ReportBanner } from '../../components/ReportBanner';
import { useStickers } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { usePushToken } from '../../hooks/usePushToken';

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? Colors.primary : color} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [activeReport, setActiveReport] = useState<ReportPayload | null>(null);
  const { stickers } = useStickers();
  const { user } = useAuth();
  const codes = stickers.map(s => s.code);

  usePushToken(user?.email ?? null);

  useReportSocket(
    (report) => setActiveReport(report),
    undefined,
    codes,
  );

  const tabBarBottomPad = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 8);
  const tabBarHeight = Platform.OS === 'ios' ? tabBarBottomPad + 56 : tabBarBottomPad + 52;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.divider,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: tabBarBottomPad,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 10,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="stickers"
          options={{
            title: 'Stickers',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'pricetag' : 'pricetag-outline'} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="incidents"
          options={{
            title: 'Incidents',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'alert-circle' : 'alert-circle-outline'} color={color} focused={focused} />,
            tabBarBadge: activeReport ? '!' : undefined,
            tabBarBadgeStyle: { backgroundColor: Colors.critical, fontSize: 10 },
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: 'Store',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'bag-handle' : 'bag-handle-outline'} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: 'Parking',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'map' : 'map-outline'} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} />,
          }}
        />
      </Tabs>

      <ReportBanner
        report={activeReport}
        onDismiss={() => setActiveReport(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
  iconWrapActive: {},
});
