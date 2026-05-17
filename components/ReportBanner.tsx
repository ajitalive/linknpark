import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { ReportPayload } from '../hooks/usePushNotifications';

const REASON_ICONS: Record<string, string> = {
  blocking: 'ban',
  lights:   'sunny',
  accident: 'warning',
  suspect:  'shield-checkmark',
  theft:    'lock-closed',
  other:    'chatbubble-ellipses',
};

const REASON_COLORS: Record<string, string> = {
  blocking: Colors.critical,
  lights:   Colors.amber,
  accident: Colors.high,
  suspect:  '#7C3AED',
  theft:    Colors.critical,
  other:    Colors.primary,
};

type Props = {
  report: ReportPayload | null;
  onDismiss: () => void;
};

export function ReportBanner({ report, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!report) return;

    Vibration.vibrate([0, 200, 100, 200]);

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 7 seconds
    const timer = setTimeout(() => dismiss(), 7000);
    return () => clearTimeout(timer);
  }, [report]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -160, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }

  function openIncidents() {
    dismiss();
    router.push('/(tabs)/incidents');
  }

  if (!report) return null;

  const accentColor = REASON_COLORS[report.reason] || Colors.primary;
  const iconName = (REASON_ICONS[report.reason] || 'alert-circle') as any;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.banner, { borderLeftColor: accentColor }]}
        onPress={openIncidents}
        activeOpacity={0.95}
      >
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={iconName} size={22} color={accentColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <Text style={styles.title} numberOfLines={1}>
              {report.reasonLabel}
            </Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {report.message || 'Someone reported an issue with your vehicle'}
          </Text>
          <Text style={styles.cta}>Tap to view →</Text>
        </View>

        <TouchableOpacity onPress={dismiss} style={styles.close} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cta: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  close: { padding: 2 },
});
