import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card, Chip, StatusDot, Badge, Button } from '../../components/ui';
import { VehicleIcon } from '../../components/VehicleIcon';
import { MOCK_STICKERS } from '../../constants/MockData';

const FILTERS = ['All', 'Active', 'Paused', 'Flagged'];

export default function StickersScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = MOCK_STICKERS.filter(s => {
    const matchFilter = filter === 'All' || s.status === filter.toLowerCase();
    const matchSearch = s.vehicleName.toLowerCase().includes(search.toLowerCase()) ||
      s.registration.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Stickers</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/activate' as any)}
          >
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or plate..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FILTERS.map(f => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No stickers found</Text>
            <Text style={styles.emptySub}>Try a different filter or activate a new sticker</Text>
            <Button label="Activate Sticker" onPress={() => router.push('/activate' as any)} style={{ marginTop: 16 }} />
          </View>
        ) : (
          filtered.map(s => <StickerCard key={s.id} sticker={s} />)
        )}
      </ScrollView>
    </View>
  );
}

function StickerCard({ sticker }: { sticker: typeof MOCK_STICKERS[0] }) {
  const isPaused = sticker.status === 'paused';

  return (
    <Card onPress={() => router.push(`/sticker/${sticker.id}` as any)} style={isPaused ? { opacity: 0.75 } : {}}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <VehicleIcon type={sticker.type} size={22} />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{sticker.vehicleName}</Text>
            <StatusDot status={sticker.status} />
            <Text style={[styles.statusLabel, { color: sticker.status === 'active' ? Colors.success : Colors.paused }]}>
              {sticker.status.charAt(0).toUpperCase() + sticker.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.cardReg}>{sticker.registration} · {sticker.color} {sticker.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatItem icon="scan" label="Scans" value={String(sticker.scanCount)} />
        <StatItem
          icon="alert-circle"
          label="Incidents"
          value={String(sticker.openIncidents)}
          highlight={sticker.openIncidents > 0}
        />
        <StatItem icon="document-text" label="Docs" value={String(sticker.docCount)} />
        <StatItem icon="time" label="Last scan" value={sticker.lastScanned} small />
      </View>

      {/* Open incident banner */}
      {sticker.openIncidents > 0 && (
        <View style={styles.incidentBanner}>
          <Ionicons name="warning" size={14} color={Colors.high} />
          <Text style={styles.incidentBannerText}>{sticker.openIncidents} open incident — tap to view</Text>
        </View>
      )}
    </Card>
  );
}

function StatItem({ icon, label, value, highlight, small }: any) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={14} color={highlight ? Colors.high : Colors.textMuted} />
      <Text style={[styles.statValue, highlight && { color: Colors.high }, small && { fontSize: 11 }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 0,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterRow: { marginBottom: 12 },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  cardReg: { fontSize: 13, color: Colors.textSecondary },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: Colors.divider, paddingTop: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  incidentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.highBg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 10,
  },
  incidentBannerText: { fontSize: 12, fontWeight: '600', color: Colors.high },
});
