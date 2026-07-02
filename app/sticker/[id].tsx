import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Share,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Card, Button, Divider, Badge } from '../../components/ui';
import { VehicleIcon } from '../../components/VehicleIcon';
import { IncidentIcon } from '../../components/IncidentIcon';
import { useStickers, useIncidents, updateSticker, deleteSticker } from '../../hooks/useApi';
import { confirmAction } from '../../components/confirm';

const SCANNER_BASE = 'https://scan.linknpark.in';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function StickerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stickers, loading, refresh } = useStickers();
  const { incidents } = useIncidents();
  const sticker = stickers.find(s => s.id === id);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (sticker) setIsPaused(sticker.status === 'paused');
  }, [sticker?.id, sticker?.status]);

  if (loading && !sticker) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!sticker) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.textMuted} />
        <Text style={styles.notFoundTitle}>Sticker not found</Text>
        <Text style={styles.notFoundSub}>It may have been deleted or doesn't belong to this account.</Text>
        <Button label="Back to Stickers" onPress={() => router.replace('/(tabs)/stickers')} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const displayName = sticker.vehicle_name || sticker.registration;
  const relatedIncidents = incidents.filter(i => i.sticker_code === sticker.code).slice(0, 5);
  const openIncidents = relatedIncidents.filter(i => i.status === 'open').length;

  async function toggleStatus(active: boolean) {
    const newStatus = active ? 'active' : 'paused';
    setIsPaused(!active);
    try {
      await updateSticker(sticker!.id, { status: newStatus });
      refresh();
    } catch (e: any) {
      setIsPaused(active);
      Alert.alert('Could not update', e?.message || 'Try again');
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Scan this LinkNPark QR to contact me about my ${displayName}:\n${SCANNER_BASE}?code=${sticker!.code}`,
      });
    } catch {}
  }

  function handleDelete() {
    confirmAction({
      title: 'Deactivate this sticker?',
      message: 'Anyone scanning it will see "Sticker not active". You can re-add it later if you keep the physical sticker.',
      confirmLabel: 'Deactivate',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteSticker(sticker!.id);
          router.replace('/(tabs)/stickers');
        } catch (e: any) {
          Alert.alert('Could not deactivate', e?.message || 'Try again');
        }
      },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={isPaused ? ['#6B7280', '#9CA3AF'] : [Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/stickers');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.bg} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <VehicleIcon type={sticker.vehicle_type} size={28} color={Colors.bg} bgColor="rgba(0,0,0,0.1)" />
          <Text style={styles.vehicleName}>{displayName}</Text>
          <Text style={styles.vehicleReg}>{sticker.registration}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isPaused ? 'rgba(0,0,0,0.4)' : '#10B981' }]} />
            <Text style={styles.statusText}>{isPaused ? 'Paused' : 'Active'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.qrRow}>
            <View style={styles.qrBox}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`${SCANNER_BASE}?code=${sticker.code}`}
                  size={120}
                  color="#000000"
                  backgroundColor="#fff"
                />
              </View>
              <Text style={styles.stickerId}>{sticker.code}</Text>
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrAction} onPress={handleShare}>
                <View style={styles.qrActionIcon}>
                  <Ionicons name="share-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.qrActionLabel}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrAction} onPress={() => router.push({ pathname: '/scan', params: { returnTo: `/sticker/${sticker.id}` } })}>
                <View style={styles.qrActionIcon}>
                  <Ionicons name="scan" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.qrActionLabel}>Test Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Sticker Active</Text>
              <Text style={styles.toggleSub}>
                {isPaused ? 'Scanner sees "Sticker not active"' : 'Anyone can contact you via this sticker'}
              </Text>
            </View>
            <Switch
              value={!isPaused}
              onValueChange={toggleStatus}
              trackColor={{ true: Colors.primary, false: Colors.divider }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Vehicle Information</Text>
          <Divider style={{ marginVertical: 10 }} />
          <InfoRow label="Registration" value={sticker.registration} />
          <InfoRow label="Type" value={sticker.vehicle_type.charAt(0).toUpperCase() + sticker.vehicle_type.slice(1)} />
          {sticker.color ? <InfoRow label="Color" value={sticker.color} /> : null}
          {sticker.vehicle_name ? <InfoRow label="Name" value={sticker.vehicle_name} /> : null}
          {sticker.backup_phone ? <InfoRow label="Backup Phone" value={sticker.backup_phone} /> : null}
          <InfoRow label="Sticker Code" value={sticker.code} mono />
          <InfoRow label="Activated" value={timeAgo(sticker.created_at)} />
        </Card>

        <View style={styles.statsGrid}>
          <StatCard icon="scan" label="Total Scans" value={String(sticker.scan_count ?? 0)} color={Colors.primary} />
          <StatCard icon="alert-circle" label="Open" value={String(openIncidents)} color={Colors.high} />
          <StatCard icon="time" label="Last Scan" value={timeAgo(sticker.last_scanned_at)} color={Colors.amber} small />
        </View>

        <Text style={styles.sectionLabel}>Recent Incidents</Text>
        {relatedIncidents.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={32} color={Colors.textMuted} />
              <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 6 }}>No incidents yet</Text>
            </View>
          </Card>
        ) : (
          relatedIncidents.map(inc => (
            <Card key={inc.id} onPress={() => router.push(`/incident/${inc.id}` as any)}>
              <View style={styles.incRow}>
                <IncidentIcon type={inc.reason as any} size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.incType}>{inc.reason_label}</Text>
                  <Text style={styles.incTime}>{timeAgo(inc.reported_at)} · {inc.reporter_phone || 'Anonymous'}</Text>
                </View>
                <Badge
                  label={inc.status}
                  color={inc.status === 'open' ? Colors.high : Colors.success}
                  bg={inc.status === 'open' ? Colors.highBg : Colors.successBg}
                  size="sm"
                />
              </View>
            </Card>
          ))
        )}

        <Text style={[styles.sectionLabel, { color: Colors.critical, marginTop: 8 }]}>Danger Zone</Text>
        <Card>
          <Button label="Deactivate Sticker" variant="danger" size="sm" onPress={handleDelete} />
        </Card>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoMono]}>{value}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color, small }: any) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, small && { fontSize: 10 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  notFoundSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  vehicleName: { fontSize: 22, fontWeight: '800', color: Colors.bg },
  vehicleReg: { fontSize: 15, color: 'rgba(0,0,0,0.6)', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: Colors.bg, fontSize: 13, fontWeight: '600' },
  qrRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  qrBox: { alignItems: 'center' },
  qrWrapper: { width: 128, height: 128, backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1.5, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stickerId: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
  qrActions: { flex: 1, gap: 12 },
  qrAction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qrActionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  qrActionLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  toggleSub: { fontSize: 12, color: Colors.textSecondary, maxWidth: 220 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  infoMono: { fontFamily: 'monospace', fontSize: 12 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderTopWidth: 3 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  incRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  incType: { fontSize: 14, fontWeight: '600', color: Colors.text },
  incTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
