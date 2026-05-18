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
  const isOpen = incident.status === 'open';
  const sticker = incident.stickers;

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
              label={incident.severity.toUpperCase()}
              color={(Colors as any)[incident.severity] || Colors.high}
              bg={(Colors as any)[`${incident.severity}Bg`] || Colors.highBg}
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
  header: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  incType: { fontSize: 15, fontWeight: '700', color: Colors.text },
  incVehicle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  incMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 10, marginBottom: 10, flexWrap: 'wrap' },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  timelineText: { fontSize: 12, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
