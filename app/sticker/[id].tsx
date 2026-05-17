import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
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
import { MOCK_STICKERS, MOCK_INCIDENTS, MOCK_SCAN_HISTORY } from '../../constants/MockData';
import { API_BASE } from '../../hooks/usePushNotifications';

// Scanner landing page base URL — same IP as API server, port 8082
const SCANNER_BASE = API_BASE.replace(':3001', ':8082');

export default function StickerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sticker = MOCK_STICKERS.find(s => s.id === id) ?? MOCK_STICKERS[0];
  const [isPaused, setIsPaused] = useState(sticker.status === 'paused');

  const relatedIncidents = MOCK_INCIDENTS.slice(0, 2);
  const relatedScans = MOCK_SCAN_HISTORY.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={isPaused ? ['#6B7280', '#9CA3AF'] : [Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <VehicleIcon type={sticker.type} size={28} color="#fff" bgColor="rgba(255,255,255,0.2)" />
          <Text style={styles.vehicleName}>{sticker.vehicleName}</Text>
          <Text style={styles.vehicleReg}>{sticker.registration}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isPaused ? '#fff8' : '#4ade80' }]} />
            <Text style={styles.statusText}>{isPaused ? 'Paused' : 'Active'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Card */}
        <Card>
          <View style={styles.qrRow}>
            <View style={styles.qrBox}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`${SCANNER_BASE}?code=${sticker.id.toUpperCase()}`}
                  size={120}
                  color={Colors.primary}
                  backgroundColor="#fff"
                  logo={undefined}
                />
              </View>
              <Text style={styles.stickerId}>{sticker.id.toUpperCase()}</Text>
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrAction}>
                <View style={styles.qrActionIcon}>
                  <Ionicons name="share-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.qrActionLabel}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrAction}>
                <View style={styles.qrActionIcon}>
                  <Ionicons name="download-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.qrActionLabel}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrAction}>
                <View style={styles.qrActionIcon}>
                  <Ionicons name="radio-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.qrActionLabel}>Write NFC</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Pause toggle */}
        <Card>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Sticker Active</Text>
              <Text style={styles.toggleSub}>
                {isPaused ? 'Scanner sees "Owner Unavailable"' : 'Anyone can contact you via this sticker'}
              </Text>
            </View>
            <Switch
              value={!isPaused}
              onValueChange={v => setIsPaused(!v)}
              trackColor={{ true: Colors.primary, false: Colors.divider }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <Text style={styles.sectionLabel}>Vehicle Information</Text>
          <Divider style={{ marginVertical: 10 }} />
          <InfoRow label="Registration" value={sticker.registration} />
          <InfoRow label="Type" value={sticker.type.charAt(0).toUpperCase() + sticker.type.slice(1)} />
          <InfoRow label="Color" value={sticker.color} />
          <InfoRow label="Sticker ID" value={sticker.id.toUpperCase()} mono />
        </Card>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="scan" label="Total Scans" value={String(sticker.scanCount)} color={Colors.primary} />
          <StatCard icon="alert-circle" label="Incidents" value={String(sticker.openIncidents)} color={Colors.high} />
          <StatCard icon="document-text" label="Documents" value={String(sticker.docCount)} color={Colors.success} />
          <StatCard icon="time" label="Last Scan" value="2h ago" color={Colors.amber} small />
        </View>

        {/* Recent Incidents */}
        <Text style={styles.sectionLabel}>Recent Incidents</Text>
        {relatedIncidents.map(inc => (
          <Card key={inc.id} onPress={() => router.push(`/incident/${inc.id}` as any)}>
            <View style={styles.incRow}>
              <IncidentIcon type={inc.type} size={16} />
              <View style={{ flex: 1 }}>
                <Text style={styles.incType}>{IncidentColors[inc.type]?.label}</Text>
                <Text style={styles.incTime}>{inc.reportedAgo} · {inc.reportedBy}</Text>
              </View>
              <Badge
                label={inc.status}
                color={inc.status === 'open' ? Colors.high : Colors.success}
                bg={inc.status === 'open' ? Colors.highBg : Colors.successBg}
                size="sm"
              />
            </View>
          </Card>
        ))}

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { color: Colors.critical, marginTop: 8 }]}>Danger Zone</Text>
        <Card>
          <Button label="Transfer Ownership" variant="ghost" size="sm" style={{ marginBottom: 8 }} />
          <Button label="Request Replacement" variant="secondary" size="sm" style={{ marginBottom: 8 }} />
          <Button label="Deactivate Sticker" variant="danger" size="sm" />
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
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  vehicleName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  vehicleReg: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  incRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  incType: { fontSize: 14, fontWeight: '600', color: Colors.text },
  incTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
