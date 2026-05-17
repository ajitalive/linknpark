import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Chip, Badge } from '../../components/ui';
import { IncidentIcon } from '../../components/IncidentIcon';
import { MOCK_INCIDENTS } from '../../constants/MockData';

const FILTERS = ['All', 'Open', 'Resolved', 'Escalated'];

export default function IncidentsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');

  const filtered = MOCK_INCIDENTS.filter(i =>
    filter === 'All' || i.status === filter.toLowerCase()
  );

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Incidents</Text>
          <View style={[styles.badge, { backgroundColor: Colors.criticalBg }]}>
            <Text style={[styles.badgeText, { color: Colors.critical }]}>1 Open</Text>
          </View>
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
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySub}>No incidents in this category.</Text>
          </View>
        ) : (
          filtered.map(inc => (
            <IncidentCard key={inc.id} incident={inc} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function IncidentCard({ incident }: { incident: typeof MOCK_INCIDENTS[0] }) {
  const meta = IncidentColors[incident.type];
  const isOpen = incident.status === 'open';

  return (
    <TouchableOpacity
      style={[styles.card, isOpen && { borderLeftWidth: 4, borderLeftColor: meta?.color }]}
      onPress={() => router.push(`/incident/${incident.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <IncidentIcon type={incident.type} size={20} />
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.incType}>{meta?.label}</Text>
            <Badge
              label={incident.severity.toUpperCase()}
              color={Colors[incident.severity as keyof typeof Colors] as string}
              bg={Colors[`${incident.severity}Bg` as keyof typeof Colors] as string}
              size="sm"
            />
          </View>
          <Text style={styles.incVehicle}>{incident.registration} · {incident.stickerName}</Text>
          <Text style={styles.incMsg} numberOfLines={2}>{incident.message}</Text>
        </View>
      </View>

      {/* Timeline row */}
      <View style={styles.timelineRow}>
        <View style={styles.timelineItem}>
          <Ionicons name="person" size={12} color={Colors.textMuted} />
          <Text style={styles.timelineText}>{incident.reportedBy}</Text>
        </View>
        <View style={styles.timelineItem}>
          <Ionicons name="time" size={12} color={Colors.textMuted} />
          <Text style={styles.timelineText}>{incident.reportedAgo}</Text>
        </View>
        {incident.escalationLevel > 0 && (
          <View style={[styles.timelineItem, { backgroundColor: Colors.highBg, borderRadius: 8, paddingHorizontal: 6 }]}>
            <Ionicons name="arrow-up-circle" size={12} color={Colors.high} />
            <Text style={[styles.timelineText, { color: Colors.high }]}>Escalated</Text>
          </View>
        )}
        {incident.hasPhoto && (
          <View style={styles.timelineItem}>
            <Ionicons name="image" size={12} color={Colors.textMuted} />
            <Text style={styles.timelineText}>Photo</Text>
          </View>
        )}
      </View>

      {/* Status + Actions */}
      {isOpen ? (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryBg }]}>
            <Ionicons name="call" size={14} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryBg }]}>
            <Ionicons name="chatbubble" size={14} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successBg, flex: 1.5 }]}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resolvedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.success }}>Resolved</Text>
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
