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
import { MOCK_USER, MOCK_STICKERS, MOCK_INCIDENTS, MOCK_SCAN_HISTORY } from '../../constants/MockData';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'qr-code', label: 'Activate\nSticker', route: '/activate', color: Colors.primary, bg: Colors.primaryBg },
  { icon: 'location', label: 'Parked\nLocation', route: null, color: Colors.success, bg: Colors.successBg },
  { icon: 'medical', label: 'SOS\nAlert', route: null, color: Colors.critical, bg: Colors.criticalBg },
  { icon: 'shield', label: 'Guard\nMode', route: '/guard', color: Colors.amber, bg: Colors.amberBg },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const openIncident = MOCK_INCIDENTS.find(i => i.status === 'open');
  const expiringDocs = 2;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: Colors.bg }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{MOCK_USER.name.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RS</Text>
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
                {IncidentColors[openIncident.type]?.label} · {openIncident.registration}
              </Text>
            </View>
            <Text style={styles.alertTime}>{openIncident.reportedAgo}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {/* KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll} contentContainerStyle={{ paddingRight: 16 }}>
          <KPICard value="3" label="Active Stickers" icon="pricetag" color={Colors.primary} bg={Colors.primaryBg} />
          <KPICard value="1" label="Open Incident" icon="alert-circle" color={Colors.high} bg={Colors.highBg} />
          <KPICard value="2" label="Docs Expiring" icon="document-text" color={Colors.amber} bg={Colors.amberBg} />
          <KPICard value="14" label="Total Scans" icon="scan" color={Colors.success} bg={Colors.successBg} />
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
                <IncidentIcon type={openIncident.type} size={22} />
                <View style={styles.incidentInfo}>
                  <View style={styles.incidentHeader}>
                    <Text style={styles.incidentType}>{IncidentColors[openIncident.type]?.label}</Text>
                    <Badge
                      label={openIncident.severity.toUpperCase()}
                      color={Colors[openIncident.severity as keyof typeof Colors] as string}
                      bg={Colors[`${openIncident.severity}Bg` as keyof typeof Colors] as string}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.incidentVehicle}>{openIncident.registration} · {openIncident.reportedBy}</Text>
                  <Text style={styles.incidentMsg} numberOfLines={2}>{openIncident.message}</Text>
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
        <SectionHeader
          title="My Stickers"
          action="Manage"
          onAction={() => router.push('/(tabs)/stickers')}
        />
        {MOCK_STICKERS.slice(0, 2).map(s => (
          <Card key={s.id} onPress={() => router.push(`/sticker/${s.id}` as any)}>
            <View style={styles.stickerRow}>
              <VehicleIcon type={s.type} size={22} />
              <View style={styles.stickerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.stickerName}>{s.vehicleName}</Text>
                  <StatusDot status={s.status} />
                </View>
                <Text style={styles.stickerReg}>{s.registration}</Text>
              </View>
              <View style={styles.stickerMeta}>
                <Text style={styles.stickerScan}>Last scan</Text>
                <Text style={styles.stickerScanTime}>{s.lastScanned}</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Recent Scans */}
        <SectionHeader title="Recent Activity" />
        {MOCK_SCAN_HISTORY.slice(0, 3).map(s => (
          <View key={s.id} style={styles.activityRow}>
            <IncidentIcon type={s.type} size={16} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityText}>
                <Text style={{ fontWeight: '600' }}>{s.sticker}</Text> scanned · {IncidentColors[s.type]?.label}
              </Text>
              <Text style={styles.activityTime}>{s.time} · {s.scanner}</Text>
            </View>
            {s.hasLocation && <Ionicons name="location" size={14} color={Colors.primary} />}
          </View>
        ))}
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
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  avatarBtn: {},
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.high },
  alertText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  alertTime: { fontSize: 12, color: Colors.textSecondary },
  content: { padding: 16 },
  kpiScroll: { marginLeft: -16, marginBottom: 24 },
  kpiCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 16, marginLeft: 16, width: 120,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickAction: {
    width: (width - 52) / 4, alignItems: 'center',
    borderRadius: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 11, color: Colors.text, fontWeight: '600', textAlign: 'center', lineHeight: 15 },
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
