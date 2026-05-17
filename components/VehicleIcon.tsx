import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const ICON_MAP: Record<string, string> = {
  car: 'car',
  bike: 'bicycle',
  truck: 'bus',
  auto: 'car-sport',
  scooty: 'bicycle',
  luggage: 'briefcase',
  asset: 'cube',
  visitor_pass: 'person',
  slot: 'location',
};

interface VehicleIconProps {
  type: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export function VehicleIcon({ type, size = 24, color = Colors.primary, bgColor = Colors.primaryBg }: VehicleIconProps) {
  const iconName = (ICON_MAP[type] || 'car') as any;
  return (
    <View style={[styles.container, { backgroundColor: bgColor, width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 }]}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
});
