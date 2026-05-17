import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { MOCK_USER } from '../../constants/MockData';

const MENU_SECTIONS = [
  {
    title: 'Safety',
    items: [
      { icon: 'people', label: 'Emergency Contacts', color: Colors.critical, badge: '2 contacts', route: null },
      { icon: 'shield', label: 'Guardian Network', color: Colors.primary, badge: null, route: null },
      { icon: 'medical', label: 'SOS Settings', color: Colors.critical, badge: null, route: null },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: 'shield-half', label: 'Guard Mode', color: Colors.amber, badge: null, route: '/guard' },
      { icon: 'location', label: 'Parked Location', color: Colors.success, badge: null, route: null },
      { icon: 'time', label: 'Parking Timer', color: Colors.primary, badge: null, route: null },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'card', label: 'Plan & Subscription', color: Colors.primary, badge: 'Premium', route: null },
      { icon: 'notifications', label: 'Notification Preferences', color: Colors.amber, badge: null, route: null },
      { icon: 'lock-closed', label: 'Privacy Settings', color: Colors.primary, badge: null, route: null },
      { icon: 'help-circle', label: 'Help & Support', color: Colors.textSecondary, badge: null, route: null },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      { icon: 'log-out', label: 'Log Out', color: Colors.critical, badge: null, route: '/(auth)/onboarding' },
    ],
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>RS</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{MOCK_USER.name}</Text>
          <Text style={styles.profilePhone}>{MOCK_USER.phone}</Text>
        </View>
        <View style={styles.planBadge}>
          <Ionicons name="star" size={12} color={Colors.amber} />
          <Text style={styles.planText}>{MOCK_USER.plan}</Text>
        </View>
      </LinearGradient>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatPill icon="pricetag" label="3 Stickers" color={Colors.primary} bg={Colors.primaryBg} />
        <StatPill icon="alert-circle" label="1 Open" color={Colors.high} bg={Colors.highBg} />
        <StatPill icon="scan" label="14 Scans" color={Colors.success} bg={Colors.successBg} />
      </View>

      {/* Menu Sections */}
      {MENU_SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  i < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => item.route && router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, item.label === 'Log Out' && { color: Colors.critical }]}>
                  {item.label}
                </Text>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>LinkNPark v1.0.0 · Made in India 🇮🇳</Text>
    </ScrollView>
  );
}

function StatPill({ icon, label, color, bg }: any) {
  return (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statPillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 24 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profilePhone: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  planText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 20, paddingVertical: 8 },
  statPillText: { fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBadge: { backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 24 },
});
