import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

type Guardian = { id: string; name: string; zone: string; active: boolean };

const MOCK_GUARDIANS: Guardian[] = [
  { id: '1', name: 'Sector 7 Residents', zone: 'Koramangala, Bengaluru', active: true },
  { id: '2', name: 'Tech Park Commuters', zone: 'Electronic City, Bengaluru', active: false },
];

export default function GuardianNetworkScreen() {
  const insets = useSafeAreaInsets();
  const [guardians, setGuardians] = useState<Guardian[]>(MOCK_GUARDIANS);
  const [networkEnabled, setNetworkEnabled] = useState(true);

  function toggleGuardian(id: string) {
    setGuardians(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Guardian Network</Text>
          <Text style={styles.headerSub}>Community watch for your vehicle</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.masterToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>Guardian Network</Text>
              <Text style={styles.masterDesc}>
                {networkEnabled ? 'Your vehicle is watched by the community' : 'Guardian network is disabled'}
              </Text>
            </View>
            <Switch
              value={networkEnabled}
              onValueChange={setNetworkEnabled}
              trackColor={{ true: Colors.primary, false: Colors.divider }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>How It Works</Text>
          <View style={{ gap: 12 }}>
            <FeatureRow icon="scan" color={Colors.primary} title="Community Watch" desc="Nearby LinkNPark users can report incidents on your vehicle even without scanning your specific sticker." />
            <FeatureRow icon="notifications" color={Colors.amber} title="Instant Alerts" desc="You get notified the moment any community member flags an issue near your parked vehicle." />
            <FeatureRow icon="location" color={Colors.success} title="Zone-Based" desc="Join local zones to receive and contribute to neighbourhood watch alerts." />
          </View>
        </Card>

        <Text style={styles.listLabel}>Your Zones</Text>
        {guardians.map(g => (
          <Card key={g.id}>
            <View style={styles.guardianRow}>
              <View style={[styles.zoneIcon, { backgroundColor: g.active ? Colors.primaryBg : Colors.surfaceSecondary }]}>
                <Ionicons name="location" size={20} color={g.active ? Colors.primary : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneName}>{g.name}</Text>
                <Text style={styles.zoneArea}>{g.zone}</Text>
              </View>
              <Switch
                value={g.active}
                onValueChange={() => toggleGuardian(g.id)}
                trackColor={{ true: Colors.primary, false: Colors.divider }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        ))}

        <Button
          label="Join a New Zone"
          onPress={() => {}}
          icon={<Ionicons name="add" size={18} color="#fff" />}
          size="lg"
        />

        <Card style={{ marginTop: 8 }}>
          <View style={styles.statRow}>
            <StatItem value="247" label="Zone Members" color={Colors.primary} />
            <StatItem value="12" label="Alerts This Week" color={Colors.amber} />
            <StatItem value="98%" label="Response Rate" color={Colors.success} />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, color, title, desc }: any) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function StatItem({ value, label, color }: any) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  masterToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  masterTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  masterDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  featureRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  featureDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  listLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 4, marginLeft: 4 },
  guardianRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  zoneName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  zoneArea: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});
