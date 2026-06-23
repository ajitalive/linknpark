import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Card } from '../components/ui';
import { getToken } from '../hooks/useAuth';
import { API_BASE } from '../hooks/usePushNotifications';

type Incident = {
  id: string;
  reason_label: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  reported_at: string;
  message?: string;
  stickers: { vehicle_name: string; registration: string; vehicle_type: string };
};

type Sticker = {
  id: string;
  code: string;
  vehicle_name: string;
  registration: string;
  scan_count: number;
  last_scanned_at: string | null;
};

const REASON_ICON: Record<string, string> = {
  blocking: 'car',
  lights_on: 'flashlight',
  emergency: 'alert-circle',
  horn: 'volume-high',
  accident: 'warning',
  other: 'ellipsis-horizontal-circle',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function statusColor(status: string): string {
  if (status === 'resolved') return Colors.success;
  if (status === 'dismissed') return Colors.textMuted;
  return Colors.amber;
}

export default function SafetyRadarScreen() {
  const insets = useSafeAreaInsets();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setError('Not logged in'); setLoading(false); return; }

      const headers = { Authorization: `Bearer ${token}` };
      const [incRes, stkRes] = await Promise.all([
        fetch(`${API_BASE}/api/incidents`, { headers }),
        fetch(`${API_BASE}/api/stickers`, { headers }),
      ]);

      const incData = await incRes.json();
      const stkData = await stkRes.json();

      setIncidents(incData.incidents || []);
      setStickers(stkData.stickers || []);
      setError(null);
    } catch (e: any) {
      setError('Could not load data. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Derived stats
  const totalScans = stickers.reduce((sum, s) => sum + (s.scan_count || 0), 0);
  const openIncidents = incidents.filter(i => i.status === 'open').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const lastScanned = stickers
    .filter(s => s.last_scanned_at)
    .sort((a, b) => new Date(b.last_scanned_at!).getTime() - new Date(a.last_scanned_at!).getTime())[0];

  const safeScore = incidents.length === 0 ? 100
    : Math.max(0, Math.round(100 - (openIncidents / Math.max(totalScans, 1)) * 100));

  const scoreColor = safeScore >= 80 ? Colors.success : safeScore >= 50 ? Colors.amber : Colors.critical;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Safety Radar</Text>
          <Text style={styles.headerSub}>Live activity across all your vehicles</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading activity…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Safety Score */}
          <Card style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreLabel}>Safety Score</Text>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>{safeScore}</Text>
                <Text style={styles.scoreCaption}>
                  {safeScore >= 80 ? 'All clear — no active issues' : safeScore >= 50 ? 'Minor issues need attention' : 'Active incidents require action'}
                </Text>
              </View>
              <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
                <Ionicons
                  name={safeScore >= 80 ? 'shield-checkmark' : safeScore >= 50 ? 'shield-half' : 'shield'}
                  size={36}
                  color={scoreColor}
                />
              </View>
            </View>
          </Card>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatPill icon="scan" label="Total Scans" value={String(totalScans)} color={Colors.primary} />
            <StatPill icon="alert-circle" label="Open" value={String(openIncidents)} color={openIncidents > 0 ? Colors.amber : Colors.textMuted} />
            <StatPill icon="checkmark-circle" label="Resolved" value={String(resolvedIncidents)} color={Colors.success} />
          </View>

          {/* Last scan */}
          {lastScanned && (
            <Card style={{ marginBottom: 16 }}>
              <View style={styles.lastScanRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${Colors.primary}18` }]}>
                  <Ionicons name="eye-outline" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastScanTitle}>Last QR Scan</Text>
                  <Text style={styles.lastScanSub}>
                    {lastScanned.vehicle_name || lastScanned.registration} · {timeAgo(lastScanned.last_scanned_at!)}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Per-vehicle scan counts */}
          {stickers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Vehicle Activity</Text>
              {stickers.map(s => (
                <Card key={s.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleRow}>
                    <View style={[styles.iconWrap, { backgroundColor: `${Colors.primary}18` }]}>
                      <Ionicons name="car-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleName}>{s.vehicle_name || s.registration}</Text>
                      <Text style={styles.vehicleSub}>{s.registration} · Code: {s.code}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.scanCount}>{s.scan_count || 0}</Text>
                      <Text style={styles.scanCountLabel}>scans</Text>
                    </View>
                  </View>
                  {s.last_scanned_at && (
                    <Text style={styles.lastScanSmall}>Last scanned {timeAgo(s.last_scanned_at)}</Text>
                  )}
                </Card>
              ))}
            </>
          )}

          {/* Incident timeline */}
          <Text style={styles.sectionTitle}>Incident Log</Text>

          {incidents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={40} color={Colors.success} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No incidents yet</Text>
              <Text style={styles.emptyText}>When someone reports an issue with your vehicle via its QR sticker, it will appear here.</Text>
            </Card>
          ) : (
            <View style={styles.timeline}>
              {incidents.map((inc, index) => {
                const isLast = index === incidents.length - 1;
                const dotColor = statusColor(inc.status);
                const iconName = REASON_ICON[inc.reason] || 'ellipsis-horizontal-circle';
                return (
                  <View key={inc.id} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                      <Card style={styles.incidentCard}>
                        <View style={styles.incidentHeader}>
                          <View style={[styles.reasonIcon, { backgroundColor: `${dotColor}18` }]}>
                            <Ionicons name={iconName as any} size={16} color={dotColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reasonLabel}>{inc.reason_label}</Text>
                            <Text style={styles.vehicleSmall}>
                              {inc.stickers?.vehicle_name || inc.stickers?.registration || inc.stickers?.vehicle_type}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: `${dotColor}18` }]}>
                            <Text style={[styles.statusText, { color: dotColor }]}>{inc.status}</Text>
                          </View>
                        </View>
                        {inc.message ? (
                          <Text style={styles.incidentMessage}>"{inc.message}"</Text>
                        ) : null}
                        <Text style={styles.incidentTime}>{timeAgo(inc.reported_at)}</Text>
                      </Card>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {stickers.length === 0 && incidents.length === 0 && (
            <Card style={styles.emptyCard}>
              <Ionicons name="qr-code-outline" size={40} color={Colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No stickers registered</Text>
              <Text style={styles.emptyText}>Register a LinkNPark sticker to your vehicle and activity will appear here.</Text>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatPill({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}30` }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scoreCard: { marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  scoreValue: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  scoreCaption: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, maxWidth: 180 },
  scoreRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statPill: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },

  lastScanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastScanTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  lastScanSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12, marginTop: 8, letterSpacing: 0.3 },

  vehicleCard: { marginBottom: 10 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  vehicleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scanCount: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  scanCountLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  lastScanSmall: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },

  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 16, paddingTop: 6 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 14 },

  incidentCard: { padding: 14, marginBottom: 0 },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reasonIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reasonLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  vehicleSmall: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  incidentMessage: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 6 },
  incidentTime: { fontSize: 11, color: Colors.textMuted },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
