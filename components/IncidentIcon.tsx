import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, IncidentColors } from '../constants/Colors';

const ICON_MAP: Record<string, string> = {
  wrong_parking: 'warning',
  blocking_exit: 'alert-circle',
  towing_risk: 'car-sport',
  emergency: 'medical',
  accident: 'flash',
  lights_on: 'bulb',
  window_open: 'cloudy',
  security_concern: 'shield',
  lost_found: 'search',
  visitor_arrived: 'person-add',
  general: 'notifications',
};

interface IncidentIconProps { type: string; size?: number }

export function IncidentIcon({ type, size = 20 }: IncidentIconProps) {
  const iconName = (ICON_MAP[type] || 'notifications') as any;
  const meta = IncidentColors[type] || { color: Colors.textSecondary, bg: Colors.surfaceSecondary };
  return (
    <View style={[styles.container, { backgroundColor: meta.bg, width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }]}>
      <Ionicons name={iconName} size={size} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
});
