import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Card, SectionHeader, Badge, StatusDot } from '../../components/ui';
import { VehicleIcon } from '../../components/VehicleIcon';
import { IncidentIcon } from '../../components/IncidentIcon';
import { MarketingBanner } from '../../components/MarketingBanner';

import { useStickers, useIncidents } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useFocusEffect } from 'expo-router';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'scan', label: 'Scan\nQR Code', route: '/scan', color: Colors.primary, bg: Colors.primaryBg },
  { icon: 'qr-code', label: 'Activate\nSticker', route: '/activate', color: Colors.success, bg: Colors.successBg },
  { icon: 'medical', label: 'SOS\nAlert', route: '/sos-settings', color: Colors.critical, bg: Colors.criticalBg },
  { icon: 'shield', label: 'Guardian\nNetwork', route: '/guardian-network', color: Colors.amber, bg: Colors.amberBg },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { stickers, refresh: refreshStickers } = useStickers();
  const { incidents, refresh: refreshIncidents } = useIncidents();

  // Only refresh when the tab regains focus AND data is actually stale.
  // The cache in useApi already handles this — calling refresh() is a no-op
  // if data was fetched within the last 30 seconds.
  useFocusEffect(React.useCallback(() => {
    refreshStickers();
    refreshIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const openIncidents = incidents.filter(i => i.status === 'open');
  const openIncident = openIncidents[0];
  const totalScans = stickers.reduce((sum, s) => sum + (s.scan_count || 0), 0);
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];
  const initials = (displayName[0] || 'L').toUpperCase() + (displayName[1] || '').toUpperCase();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: Colors.bg }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>LinkNPark OS</Text>
            <Text style={styles.userName}>Hello, {firstName} <Text style={{color: Colors.primary}}>●</Text></Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/more')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Alert banner */}
        {openIncident && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push(`/incident/${openIncident.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.alertLeft}>
              <View style={styles.alertDot} />
              <Ionicons name="warning" size={16} color={Colors.high} />
              <Text style={styles.alertText}>
                {openIncident.reason_label} · {openIncident.stickers?.registration || openIncident.sticker_code}
              </Text>
            </View>
            <Text style={styles.alertTime}>{timeAgo(openIncident.reported_at)}</Text>
          </TouchableOpacity>
        )}
      </View>

      <MarketingBanner />

      <View style={styles.content}>

        {/* KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll} contentContainerStyle={{ paddingRight: 16 }}>
          <KPICard value={String(stickers.length)} label="Active Stickers" icon="pricetag" color={Colors.primary} bg={Colors.primaryBg} />
          <KPICard value={String(openIncidents.length)} label={openIncidents.length === 1 ? "Open Incident" : "Open Incidents"} icon="alert-circle" color={Colors.high} bg={Colors.highBg} />
          <KPICard value={String(totalScans)} label="Total Scans" icon="scan" color={Colors.success} bg={Colors.successBg} />
        </ScrollView>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickAction, { backgroundColor: Colors.surface }]}
              onPress={() => a.route && router.push(a.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon as any} size={24} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Open Incidents */}
        {openIncident && (
          <>
            <SectionHeader
              title="Open Incidents"
              action="View All"
              onAction={() => router.push('/(tabs)/incidents')}
            />
            <Card onPress={() => router.push(`/incident/${openIncident.id}` as any)}>
              <View style={styles.incidentRow}>
                <IncidentIcon type={openIncident.reason as any} size={22} />
                <View style={styles.incidentInfo}>
                  <View style={styles.incidentHeader}>
                    <Text style={styles.incidentType}>{openIncident.reason_label}</Text>
                    <Badge
                      label={
                        (IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.color === Colors.critical) ? 'CRITICAL' :
                        (IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.color === Colors.high) ? 'HIGH' :
                        (IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.color === Colors.low) ? 'LOW' : 'MEDIUM'
                      }
                      color={IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.color || Colors.high}
                      bg={IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.bg || Colors.highBg}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.incidentVehicle}>
                    {openIncident.stickers?.registration || openIncident.sticker_code} · {openIncident.reporter_phone || 'Anonymous'}
                  </Text>
                  {openIncident.message ? (
                    <Text style={styles.incidentMsg} numberOfLines={2}>{openIncident.message}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.incidentActions}>
                <TouchableOpacity style={styles.incidentActionBtn}>
                  <Ionicons name="call" size={16} color={Colors.primary} />
                  <Text style={styles.incidentActionText}>Call Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.incidentActionBtn}>
                  <Ionicons name="chatbubble" size={16} color={Colors.primary} />
                  <Text style={styles.incidentActionText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.incidentActionBtn, styles.resolveBtn]}>
                  <Ionicons name="checkmark" size={16} color={Colors.success} />
                  <Text style={[styles.incidentActionText, { color: Colors.success }]}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        {/* My Stickers */}
        {stickers.length > 0 && (
          <>
            <SectionHeader
              title="My Stickers"
              action="Manage"
              onAction={() => router.push('/(tabs)/stickers')}
            />
            {stickers.slice(0, 2).map(s => (
              <Card key={s.id} onPress={() => router.push(`/sticker/${s.id}` as any)}>
                <View style={styles.stickerRow}>
                  <VehicleIcon type={s.vehicle_type} size={22} />
                  <View style={styles.stickerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.stickerName}>{s.vehicle_name || s.registration}</Text>
                      <StatusDot status={s.status} />
                    </View>
                    <Text style={styles.stickerReg}>{s.registration}</Text>
                  </View>
                  <View style={styles.stickerMeta}>
                    <Text style={styles.stickerScan}>Last scan</Text>
                    <Text style={styles.stickerScanTime}>{timeAgo(s.last_scanned_at)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {stickers.length === 0 && (
          <Card onPress={() => router.push('/activate' as any)}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Ionicons name="add-circle" size={40} color={Colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 }}>
                Activate your first sticker
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                Tap to scan or enter your sticker code
              </Text>
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function KPICard({ value, label, icon, color, bg }: any) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: Colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { color: Colors.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 },
  userName: { color: Colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  avatarBtn: {},
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.high,
    shadowColor: Colors.high, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.high },
  alertText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  alertTime: { fontSize: 12, color: Colors.textSecondary },
  content: { padding: 16 },
  kpiScroll: { marginLeft: -16, marginBottom: 24 },
  kpiCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, marginLeft: 16, width: 140,
    borderLeftWidth: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderColor: Colors.divider,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 2,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  quickAction: {
    flex: 1, minWidth: '45%', height: 120,
    borderRadius: 20, padding: 16,
    alignItems: 'flex-start', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.divider,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '800', color: Colors.text, marginTop: 8, textAlign: 'left', lineHeight: 18 },
  incidentRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  incidentInfo: { flex: 1 },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  incidentType: { fontSize: 15, fontWeight: '700', color: Colors.text },
  incidentVehicle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  incidentMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  incidentActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 12 },
  incidentActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.primaryBg,
  },
  resolveBtn: { backgroundColor: Colors.successBg },
  incidentActionText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stickerInfo: { flex: 1 },
  stickerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  stickerReg: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  stickerMeta: { alignItems: 'flex-end' },
  stickerScan: { fontSize: 11, color: Colors.textMuted },
  stickerScanTime: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  activityTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
