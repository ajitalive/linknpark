import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Card } from '../components/ui';

const { width } = Dimensions.get('window');

const MOCK_SCANS = [
  { id: '1', location: 'UB City Parking, Level 2', time: '10 mins ago', type: 'safe' },
  { id: '2', location: 'Koramangala 4th Block', time: 'Yesterday, 6:30 PM', type: 'warning' },
  { id: '3', location: 'Indiranagar 100ft Road', time: 'Oct 12, 2:15 PM', type: 'danger' },
  { id: '4', location: 'Office Basement Park', time: 'Oct 10, 9:00 AM', type: 'safe' },
];

export default function SafetyRadarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="radar" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Safety Radar <Text style={{color: Colors.primary}}>●</Text></Text>
          <Text style={styles.headerSub}>City-wide scan history & heatmaps</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Heatmap Visualization */}
        <View style={styles.mapContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop' }} 
            style={styles.mapImage} 
            blurRadius={1}
          />
          <View style={styles.mapOverlay} />
          
          {/* Glowing Dots */}
          <View style={[styles.dot, { top: '30%', left: '40%', backgroundColor: Colors.primary, shadowColor: Colors.primary }]} />
          <View style={[styles.dot, { top: '45%', left: '60%', backgroundColor: Colors.primary, shadowColor: Colors.primary }]} />
          <View style={[styles.dot, { top: '20%', left: '70%', backgroundColor: Colors.amber, shadowColor: Colors.amber }]} />
          <View style={[styles.dot, { top: '60%', left: '35%', backgroundColor: Colors.critical, shadowColor: Colors.critical }]} />
          <View style={[styles.dot, { top: '70%', left: '50%', backgroundColor: Colors.primary, shadowColor: Colors.primary }]} />
          
          {/* Current Location Ping */}
          <View style={[styles.pingRing, { top: '30%', left: '40%' }]} />

          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendText}>Safe</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.amber }]} />
              <Text style={styles.legendText}>Warning</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.critical }]} />
              <Text style={styles.legendText}>High Risk</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Analytics Overview */}
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>85%</Text>
              <Text style={styles.statLabel}>Safe Zones</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.critical }]}>1</Text>
              <Text style={styles.statLabel}>High Risk</Text>
            </Card>
          </View>

          <Text style={styles.sectionTitle}>Recent Scan Log</Text>
          
          <View style={styles.timeline}>
            {MOCK_SCANS.map((scan, index) => {
              const isLast = index === MOCK_SCANS.length - 1;
              let dotColor = Colors.primary;
              if (scan.type === 'warning') dotColor = Colors.amber;
              if (scan.type === 'danger') dotColor = Colors.critical;

              return (
                <View key={scan.id} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor, shadowColor: dotColor }]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Card style={styles.timelineCard}>
                      <Text style={styles.scanLocation}>{scan.location}</Text>
                      <View style={styles.scanMeta}>
                        <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                        <Text style={styles.scanTime}>{scan.time}</Text>
                      </View>
                    </Card>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, backgroundColor: Colors.bg },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.divider },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  
  mapContainer: { width: '100%', height: 280, position: 'relative', borderBottomWidth: 1, borderBottomColor: Colors.divider },
  mapImage: { width: '100%', height: '100%', opacity: 0.6 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 9, 11, 0.4)' },
  
  dot: {
    position: 'absolute',
    width: 12, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5,
  },
  pingRing: {
    position: 'absolute',
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.primary,
    transform: [{ translateX: -14 }, { translateY: -14 }],
    opacity: 0.4,
  },

  mapLegend: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.divider,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.text, fontWeight: '600' },

  content: { padding: 16 },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  statValue: { fontSize: 24, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 16, letterSpacing: 0.5 },
  
  timeline: { paddingLeft: 8 },
  timelineRow: { flexDirection: 'row', gap: 16, minHeight: 80 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineCard: { padding: 16, marginBottom: 0 },
  scanLocation: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  scanMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanTime: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
});
