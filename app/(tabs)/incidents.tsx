import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Chip, Badge, Button } from '../../components/ui';
import { IncidentIcon } from '../../components/IncidentIcon';
import { useIncidents, resolveIncident, type Incident } from '../../hooks/useApi';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const FILTERS = ['All', 'Open', 'Resolved', 'Escalated'];

export default function IncidentsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const { incidents, loading, error, refresh, setIncidents } = useIncidents();

  useFocusEffect(React.useCallback(() => { refresh(); }, []));

  const filtered = incidents.filter(i =>
    filter === 'All' || i.status === filter.toLowerCase()
  );
  const openCount = incidents.filter(i => i.status === 'open').length;

  async function handleResolve(id: string) {
    try {
      await resolveIncident(id, 'resolved');
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i));
    } catch (e: any) {
      Alert.alert('Could not resolve', e?.message || 'Try again');
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Incidents</Text>
          {openCount > 0 && (
            <View style={[styles.badge, { backgroundColor: Colors.criticalBg }]}>
              <Text style={[styles.badgeText, { color: Colors.critical }]}>{openCount} Open</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {FILTERS.map(f => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        {loading && incidents.length === 0 ? (
          <View style={styles.empty}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Couldn't load</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <Button label="Retry" onPress={refresh} style={{ marginTop: 16 }} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySub}>
              {incidents.length === 0
                ? 'No reports received yet'
                : 'No incidents in this category'}
            </Text>
          </View>
        ) : (
          filtered.map(inc => (
            <IncidentCard key={inc.id} incident={inc} onResolve={() => handleResolve(inc.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function IncidentCard({ incident, onResolve }: { incident: Incident; onResolve: () => void }) {
  const meta = IncidentColors[incident.reason as keyof typeof IncidentColors];
  const label = meta?.label || incident.reason_label || incident.reason;
  const color = meta?.color || Colors.high;
  const bg = meta?.bg || Colors.highBg;
  const isOpen = incident.status === 'open';
  const sticker = incident.stickers;

  const severityText = color === Colors.critical ? 'CRITICAL' 
    : color === Colors.high ? 'HIGH' 
    : color === Colors.medium ? 'MEDIUM' 
    : color === Colors.low ? 'LOW' 
    : 'INFO';

  return (
    <TouchableOpacity
      style={[styles.card, isOpen && { borderLeftWidth: 4, borderLeftColor: color }]}
      onPress={() => router.push(`/incident/${incident.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <IncidentIcon type={incident.reason as any} size={20} />
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.incType}>{label}</Text>
            <Badge
              label={severityText}
              color={color}
              bg={bg}
              size="sm"
            />
          </View>
          <Text style={styles.incVehicle}>
            {sticker?.registration || incident.sticker_code}
            {sticker?.vehicle_name ? ` · ${sticker.vehicle_name}` : ''}
          </Text>
          {incident.message ? (
            <Text style={styles.incMsg} numberOfLines={2}>{incident.message}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.timelineRow}>
        <View style={styles.timelineItem}>
          <Ionicons name="person" size={12} color={Colors.textMuted} />
          <Text style={styles.timelineText}>
            {incident.reporter_phone || 'Anonymous'}
          </Text>
        </View>
        <View style={styles.timelineItem}>
          <Ionicons name="time" size={12} color={Colors.textMuted} />
          <Text style={styles.timelineText}>{timeAgo(incident.reported_at)}</Text>
        </View>
        {incident.has_photo && (
          <View style={styles.timelineItem}>
            <Ionicons name="image" size={12} color={Colors.textMuted} />
            <Text style={styles.timelineText}>Photo</Text>
          </View>
        )}
      </View>

      {isOpen ? (
        <View style={styles.actions}>
          {incident.reporter_phone && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryBg }]}>
              <Ionicons name="call" size={14} color={Colors.primary} />
              <Text style={[styles.actionText, { color: Colors.primary }]}>Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.successBg, flex: 1.5 }]}
            onPress={onResolve}
          >
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resolvedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.success }}>
            {incident.status === 'resolved' ? 'Resolved' : 'Dismissed'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { backgroundColor: Colors.bg, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 24 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 16, letterSpacing: -0.5 },
  emptySub: { fontSize: 15, color: Colors.textSecondary, marginTop: 8 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 28,
    padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: Colors.divider,
  },
  cardTop: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  incType: { fontSize: 17, fontWeight: '800', color: Colors.text },
  incVehicle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  incMsg: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  timelineRow: { flexDirection: 'row', gap: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 16, marginBottom: 16, flexWrap: 'wrap' },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  timelineText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16 },
  actionText: { fontSize: 14, fontWeight: '700' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
