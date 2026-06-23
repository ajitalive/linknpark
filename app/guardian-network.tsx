import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';
import { API_BASE as API_URL } from '../hooks/usePushNotifications';
import { getToken } from '../hooks/useAuth';

type Guardian = { id: string; name: string; zone: string; active: boolean };
type NearbyZone = { id: string; name: string; zone: string; distance_km: number; inside: boolean; active: boolean };
type KarmaEntry = { id: string; points: number; reason: string; created_at: string };

const KARMA_REASON_LABEL: Record<string, string> = {
  reported: 'Reported a vehicle',
  resolved_bonus: 'Alert acknowledged by owner',
};

function karmaTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function GuardianNetworkScreen() {
  const insets = useSafeAreaInsets();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [karmaBalance, setKarmaBalance] = useState<number | null>(null);
  const [karmaLog, setKarmaLog] = useState<KarmaEntry[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [nearbyZones, setNearbyZones] = useState<NearbyZone[]>([]);
  const [findingZones, setFindingZones] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchZones();
    fetchKarma();
  }, []);

  async function fetchKarma() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/karma`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setKarmaBalance(data.balance ?? 0);
        setKarmaLog(data.log ?? []);
      }
    } catch (e) {
      console.error('karma fetch error', e);
    }
  }

  async function findZonesNearby() {
    setFindingZones(true);
    setNearbyZones([]);
    setIsModalVisible(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location needed',
          'Guardian Network finds community watch zones near you. Please allow location access to continue.'
        );
        setIsModalVisible(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/guardians/zones/nearby?lat=${latitude}&lng=${longitude}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setNearbyZones(data.zones || []);
      } else {
        Alert.alert('Error', data.error || 'Could not load nearby zones.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setFindingZones(false);
    }
  }

  async function joinZone(zone: NearbyZone) {
    setJoiningId(zone.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/guardians/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId: zone.id, active: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setGuardians(prev => prev.some(g => g.id === zone.id)
          ? prev
          : [...prev, { id: zone.id, name: zone.name, zone: zone.zone, active: true }]);
        setNearbyZones(prev => prev.map(z => z.id === zone.id ? { ...z, active: true } : z));
      } else {
        Alert.alert('Error', data.error || 'Could not join this zone.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setJoiningId(null);
    }
  }

  async function fetchZones() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/guardians/zones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.zones) setGuardians(data.zones);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleGuardian(id: string, currentActive: boolean) {
    const nextActive = !currentActive;
    setGuardians(prev => prev.map(g => g.id === id ? { ...g, active: nextActive } : g));
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/guardians/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId: id, active: nextActive })
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to update zone status');
      setGuardians(prev => prev.map(g => g.id === id ? { ...g, active: currentActive } : g));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Guardian Network <Text style={{color: Colors.primary}}>●</Text></Text>
          <Text style={styles.headerSub}>Community watch for your vehicle</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Karma Dashboard */}
        <LinearGradient
          colors={[Colors.amber, Colors.high]}
          style={styles.karmaCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.karmaTitle}>Karma Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.karmaValue}>{karmaBalance ?? '—'}</Text>
              <Text style={styles.karmaPoints}>Pts</Text>
            </View>
            <Text style={styles.karmaDesc}>
              {karmaBalance === null ? 'Loading…'
                : karmaBalance === 0 ? 'Report a vehicle to start earning!'
                : `Redeem in the Store for discounts`}
            </Text>
          </View>
          <View style={styles.karmaIconWrap}>
            <Ionicons name="star" size={32} color={Colors.amber} />
          </View>
        </LinearGradient>

        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionLabel}>How to Earn Karma</Text>
          <View style={{ gap: 12 }}>
            <FeatureRow icon="scan" color={Colors.primary} title="Scan & Report" desc="Spot a car with lights on or windows down? Scan the LinkNPark tag and alert the owner (+50 Pts)." />
            <FeatureRow icon="shield-checkmark" color={Colors.success} title="Resolve Issues" desc="When the owner acknowledges your alert, you earn bonus points (+20 Pts)." />
            <FeatureRow icon="gift" color={Colors.amber} title="Redeem Rewards" desc="Use Karma points in our Store to get free tags, keychains, and discounts." />
          </View>
          <Button
            label="Go to Store"
            onPress={() => router.push('/(tabs)/store')}
            variant="secondary"
            style={{ marginTop: 16 }}
          />
        </Card>

        <Text style={[styles.listLabel, { marginTop: 20 }]}>My Good Deeds</Text>
        {karmaLog.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <Ionicons name="star-outline" size={32} color={Colors.textMuted} />
              <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
                No karma earned yet.{'\n'}Scan a LinkNPark sticker and report an issue to get started.
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {karmaLog.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: Colors.divider }} />}
                <DeedRow
                  title={KARMA_REASON_LABEL[entry.reason] || entry.reason}
                  date={karmaTimeAgo(entry.created_at)}
                  points={`+${entry.points}`}
                />
              </View>
            ))}
          </Card>
        )}

        <Text style={[styles.listLabel, { marginTop: 24 }]}>Your Active Zones</Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : guardians.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
              <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
                You haven't joined any zones yet.{'\n'}Find a community watch zone near you to get started.
              </Text>
            </View>
          </Card>
        ) : (
          guardians.map(g => (
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
                  onValueChange={() => toggleGuardian(g.id, g.active)}
                  trackColor={{ true: Colors.primary, false: Colors.divider }}
                  thumbColor="#fff"
                />
              </View>
            </Card>
          ))
        )}

        <Button
          label="Find Zones Near Me"
          onPress={findZonesNearby}
          icon={<Ionicons name="navigate" size={18} color="#fff" />}
          size="lg"
          style={{ marginTop: 12 }}
        />

        </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Zones Near You</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {findingZones ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Finding zones near you…</Text>
              </View>
            ) : nearbyZones.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                <Ionicons name="map-outline" size={36} color={Colors.textMuted} />
                <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>
                  No community watch zones near you yet.{'\n'}We're expanding — check back soon!
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 10 }}>
                {nearbyZones.map(z => (
                  <View key={z.id} style={styles.nearbyRow}>
                    <View style={[styles.zoneIcon, { backgroundColor: Colors.primaryBg }]}>
                      <Ionicons name="location" size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneName}>{z.name}</Text>
                      <Text style={styles.zoneArea}>
                        {z.zone} · {z.distance_km} km away{z.inside ? ' · You\'re here' : ''}
                      </Text>
                    </View>
                    {z.active ? (
                      <View style={styles.joinedBadge}>
                        <Ionicons name="checkmark" size={14} color={Colors.success} />
                        <Text style={styles.joinedText}>Joined</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.joinBtn}
                        onPress={() => joinZone(z)}
                        disabled={joiningId === z.id}
                      >
                        {joiningId === z.id
                          ? <ActivityIndicator size="small" color={Colors.primary} />
                          : <Text style={styles.joinBtnText}>Join</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

function DeedRow({ title, date, points }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 4 }}>{date}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.success }}>{points}</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 14,
    padding: 14,
  },
  joinBtn: {
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  karmaCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.high,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  karmaTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1 },
  karmaValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 4 },
  karmaPoints: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  karmaDesc: { fontSize: 13, color: '#fff', marginTop: 4, fontWeight: '500' },
  karmaIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
