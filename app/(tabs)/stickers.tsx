import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Card, Chip, StatusDot, Button } from '../../components/ui';
import { VehicleIcon } from '../../components/VehicleIcon';
import { useStickers, type Sticker } from '../../hooks/useApi';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const FILTERS = ['All', 'Active', 'Paused', 'Flagged'];

export default function StickersScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { stickers, loading, error, refresh } = useStickers();

  useFocusEffect(React.useCallback(() => { refresh(); }, []));

  const filtered = stickers.filter(s => {
    const matchFilter = filter === 'All' || s.status === filter.toLowerCase();
    const name = (s.vehicle_name || '').toLowerCase();
    const reg = (s.registration || '').toLowerCase();
    const q = search.toLowerCase();
    return matchFilter && (name.includes(q) || reg.includes(q));
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        {loading && stickers.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Couldn't load stickers</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <Button label="Retry" onPress={refresh} style={{ marginTop: 16 }} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {stickers.length === 0 ? 'No stickers yet' : 'No matches'}
            </Text>
            <Text style={styles.emptySub}>
              {stickers.length === 0
                ? 'Activate your first sticker to get started'
                : 'Try a different filter or search'}
            </Text>
            <Button label="Activate Sticker" onPress={() => router.push('/activate' as any)} style={{ marginTop: 16 }} />
          </View>
        ) : (
          filtered.map(s => <StickerCard key={s.id} sticker={s} />)
        )}
      </ScrollView>
    </View>
  );
}

function StickerCard({ sticker }: { sticker: Sticker }) {
  const isPaused = sticker.status === 'paused';
  const displayName = sticker.tag_title || sticker.vehicle_name || sticker.registration || 'Tag';
  const isVehicle = !sticker.tag_type || sticker.tag_type === 'vehicle';

  return (
    <Card onPress={() => router.push(`/sticker/${sticker.id}` as any)} style={isPaused ? { opacity: 0.75 } : {}}>
      <View style={styles.cardTop}>
        {isVehicle ? (
          <VehicleIcon type={sticker.vehicle_type} size={22} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={sticker.tag_type === 'keychain' ? 'key' : sticker.tag_type === 'pet' ? 'paw' : sticker.tag_type === 'doorbell' ? 'home' : 'cube'} size={22} color={Colors.primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{displayName}</Text>
            <StatusDot status={sticker.status} />
            <Text style={[styles.statusLabel, { color: sticker.status === 'active' ? Colors.success : Colors.paused }]}>
              {sticker.status.charAt(0).toUpperCase() + sticker.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.cardReg}>
            {isVehicle 
              ? `${sticker.registration}${sticker.color ? ` · ${sticker.color}` : ''} ${sticker.vehicle_type}`
              : sticker.tag_type.charAt(0).toUpperCase() + sticker.tag_type.slice(1)
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>

      <View style={styles.statsRow}>
        <StatItem icon="scan" label="Scans" value={String(sticker.scan_count ?? 0)} />
        <StatItem icon="qr-code" label="Code" value={sticker.code.split('-').pop() || ''} small />
        <StatItem icon="time" label="Last scan" value={timeAgo(sticker.last_scanned_at)} small />
      </View>
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
    backgroundColor: Colors.bg, paddingHorizontal: 20, paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
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
