import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export const PROVIDER_GOOGLE = 'google';

export const Marker = ({ children }: any) => {
  // Markers are not rendered on the web placeholder
  return null;
};

export const MapView = ({ children, style }: any) => {
  return (
    <View style={[style, styles.container]}>
      <Ionicons name="map-outline" size={48} color={Colors.textMuted} style={styles.icon} />
      <Text style={styles.title}>Interactive Map</Text>
      <Text style={styles.subtitle}>
        The full map experience is available on the iOS and Android app.
      </Text>
    </View>
  );
};

export default MapView;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C23',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
});
