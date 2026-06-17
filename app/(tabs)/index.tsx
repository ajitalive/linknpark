import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Card, SectionHeader, Badge, StatusDot } from '../../components/ui';
import { VehicleIcon } from '../../components/VehicleIcon';
import { IncidentIcon } from '../../components/IncidentIcon';
import { MarketingBanner } from '../../components/MarketingBanner';

import { useStickers, useIncidents } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

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
  { icon: 'scan', label: 'Scan QR', route: '/scan', color: Colors.primary, bg: Colors.primaryBg },
  { icon: 'qr-code', label: 'Activate', route: '/activate', color: Colors.text, bg: Colors.surfaceSecondary },
  { icon: 'medical', label: 'SOS Alert', route: '/sos-settings', color: Colors.text, bg: Colors.surfaceSecondary },
  { icon: 'shield', label: 'Guardian', route: '/guardian-network', color: Colors.text, bg: Colors.surfaceSecondary },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { stickers, refresh: refreshStickers } = useStickers();
  const { incidents, refresh: refreshIncidents } = useIncidents();

  useFocusEffect(React.useCallback(() => {
    refreshStickers();
    refreshIncidents();
  }, []));

  const openIncidents = incidents.filter(i => i.status === 'open');
  const openIncident = openIncidents[0];
  const totalScans = stickers.reduce((sum, s) => sum + (s.scan_count || 0), 0);
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];
  const initials = (displayName[0] || 'L').toUpperCase() + (displayName[1] || '').toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }} // Account for floating tab bar
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Good Evening</Text>
              <Text style={styles.userName}>{firstName} <Text style={{color: Colors.primary}}>●</Text></Text>
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

        <View style={styles.content}>
          {/* Hero Section */}
          <TouchableOpacity activeOpacity={0.9} style={styles.heroCardWrapper}>
            <ImageBackground 
              source={{ uri: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=2000&auto=format&fit=crop' }}
              style={styles.heroCard}
              imageStyle={{ borderRadius: 32 }}
            >
              <LinearGradient
                colors={['rgba(11, 13, 18, 0)', 'rgba(11, 13, 18, 0.9)']}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Badge label="PREMIUM PARKING" color={Colors.primary} bg={Colors.primaryBg} size="sm" />
                  <Text style={styles.heroTitle}>Smart Mobility</Text>
                  <Text style={styles.heroSubtitle}>Manage your vehicles and parking effortlessly.</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickAction, { backgroundColor: Colors.surface }]}
                onPress={() => a.route && router.push(a.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Premium KPI Cards */}
          <View style={styles.kpiRow}>
            <KPICard value={String(stickers.length)} label="Active Vehicles" icon="car-sport" color={Colors.primary} />
            <KPICard value={String(totalScans)} label="Total Scans" icon="scan-circle" color={Colors.text} />
            <KPICard value={String(openIncidents.length)} label="Open Incidents" icon="alert-circle" color={Colors.high} />
          </View>

          {/* Open Incidents */}
          {openIncident && (
            <View style={styles.section}>
              <SectionHeader
                title="Active Incidents"
                action="View All"
                onAction={() => router.push('/(tabs)/incidents')}
              />
              <Card onPress={() => router.push(`/incident/${openIncident.id}` as any)}>
                <View style={styles.incidentRow}>
                  <View style={[styles.incidentIconWrap, { backgroundColor: IncidentColors[openIncident.reason as keyof typeof IncidentColors]?.bg || Colors.highBg }]}>
                    <IncidentIcon type={openIncident.reason as any} size={24} />
                  </View>
                  <View style={styles.incidentInfo}>
                    <View style={styles.incidentHeader}>
                      <Text style={styles.incidentType}>{openIncident.reason_label}</Text>
                      <Text style={styles.incidentTime}>{timeAgo(openIncident.reported_at)}</Text>
                    </View>
                    <Text style={styles.incidentVehicle}>
                      {openIncident.stickers?.registration || openIncident.sticker_code} · {openIncident.reporter_phone || 'Anonymous'}
                    </Text>
                  </View>
                </View>
                <View style={styles.incidentActions}>
                  <TouchableOpacity style={styles.incidentActionBtn}>
                    <Ionicons name="call" size={16} color={Colors.text} />
                    <Text style={styles.incidentActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.incidentActionBtn, styles.resolveBtn]}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.bg} />
                    <Text style={[styles.incidentActionText, { color: Colors.bg }]}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

          {/* My Stickers */}
          {stickers.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="My Garage"
                action="Manage"
                onAction={() => router.push('/(tabs)/stickers')}
              />
              {stickers.slice(0, 2).map(s => (
                <Card key={s.id} onPress={() => router.push(`/sticker/${s.id}` as any)}>
                  <View style={styles.stickerRow}>
                    <View style={styles.vehicleIconWrap}>
                      <VehicleIcon type={s.vehicle_type} size={28} />
                    </View>
                    <View style={styles.stickerInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.stickerName}>{s.vehicle_name || s.registration}</Text>
                        <StatusDot status={s.status} />
                      </View>
                      <Text style={styles.stickerReg}>{s.registration}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </View>
                </Card>
              ))}
            </View>
          )}

          {stickers.length === 0 && (
            <Card onPress={() => router.push('/activate' as any)}>
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={styles.addIconWrap}>
                  <Ionicons name="add" size={32} color={Colors.bg} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 16 }}>
                  Add Your Vehicle
                </Text>
                <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                  Scan a sticker or enter the code to link it to your account.
                </Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function KPICard({ value, label, icon, color }: any) {
  return (
    <View style={styles.kpiCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  userName: { color: Colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: {},
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 115, 22, 0.1)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.3)', marginTop: 24,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.high },
  alertText: { fontSize: 14, fontWeight: '700', color: Colors.high },
  alertTime: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  content: { padding: 16 },
  
  heroCardWrapper: { marginBottom: 24 },
  heroCard: { width: '100%', height: 200, borderRadius: 32 },
  heroGradient: { flex: 1, borderRadius: 32, padding: 24, justifyContent: 'flex-end' },
  heroContent: {},
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.white, marginTop: 8, marginBottom: 4, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAction: {
    width: (width - 32 - 36) / 4, 
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 24,
  },
  quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  kpiCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 24,
    padding: 16, borderWidth: 1, borderColor: Colors.divider,
  },
  kpiValue: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  
  section: { marginBottom: 12 },
  
  incidentRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  incidentIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  incidentInfo: { flex: 1, justifyContent: 'center' },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  incidentType: { fontSize: 16, fontWeight: '800', color: Colors.text },
  incidentTime: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  incidentVehicle: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  incidentActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 16 },
  incidentActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
  },
  resolveBtn: { backgroundColor: Colors.primary },
  incidentActionText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vehicleIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  stickerInfo: { flex: 1 },
  stickerName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  stickerReg: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  addIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
