import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useStickers, useIncidents } from '../../hooks/useApi';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

const MENU_SECTIONS = [
  {
    title: 'Safety',
    items: [
      { icon: 'map', label: 'Safety Radar', color: Colors.primary, badge: 'New', route: '/safety-radar' },
      { icon: 'location', label: 'Find Parking', color: Colors.primary, badge: 'New', route: '/find-parking' },
      { icon: 'people', label: 'Emergency Contacts', color: Colors.critical, badge: 'Manage', route: '/emergency-contacts' },
      { icon: 'shield', label: 'Guardian Network', color: Colors.primary, badge: null, route: '/guardian-network' },
      { icon: 'medical', label: 'SOS Settings', color: Colors.critical, badge: null, route: '/sos-settings' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: 'qr-code', label: 'My Free eTag', color: Colors.primary, badge: 'Free', route: '/etag' },
      { icon: 'shield-half', label: 'Guard Mode', color: Colors.amber, badge: 'B2B', route: '/guard' },
      { icon: 'time', label: 'Parking Timer', color: Colors.primary, badge: null, route: '/parking-timer' },
      { icon: 'car-sport', label: 'Find My Car', color: Colors.primary, badge: 'New', route: '/parked' },
      { icon: 'speedometer', label: 'Fuel & Costs', color: Colors.primary, badge: 'New', route: '/fuel-log' },
      { icon: 'lock-closed', label: 'Secure Vault', color: Colors.primaryDark, badge: null, route: '/(tabs)/vault' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'notifications', label: 'Notification Preferences', color: Colors.amber, badge: null, route: '/notification-preferences' },
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
  const { user, signOut } = useAuth();
  const { stickers } = useStickers();
  const { incidents } = useIncidents();
  
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayHandle = user?.email || '';
  const initials = (displayName[0] || 'U').toUpperCase() + (displayName[1] || '').toUpperCase();

  const openIncidentsCount = incidents.filter(i => i.status === 'open').length;
  const totalScans = stickers.reduce((sum, s) => sum + (s.scan_count || 0), 0);

  function handleMenuPress(item: any) {
    if (item.label === 'Log Out') {
      Alert.alert('Sign out?', 'You will need to verify your email again to sign back in.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out', style: 'destructive', onPress: async () => {
            await signOut();
            router.replace('/(auth)/onboarding');
          },
        },
      ]);
      return;
    }
    if (item.route) router.push(item.route as any);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profilePhone}>{displayHandle}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="pencil" size={16} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatPill icon="pricetag" label={`${stickers.length} Stickers`} color={Colors.primary} bg={Colors.primaryBg} />
        <StatPill icon="alert-circle" label={`${openIncidentsCount} Open`} color={openIncidentsCount > 0 ? Colors.high : Colors.textMuted} bg={openIncidentsCount > 0 ? Colors.highBg : Colors.surfaceSecondary} />
        <StatPill icon="scan" label={`${totalScans} Scans`} color={Colors.success} bg={Colors.successBg} />
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
                onPress={() => handleMenuPress(item)}
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

      <Text style={styles.version}>
        LinkNPark v1.0.0{Updates.updateId ? ` (Update: ${Updates.updateId.slice(0, 8)})` : ''} · Made in India 🇮🇳
      </Text>
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
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 32, backgroundColor: Colors.bg },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  avatarText: { color: Colors.bg, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 },
  profileName: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  profilePhone: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  editBtn: { backgroundColor: Colors.surface, padding: 12, borderRadius: 24, borderWidth: 1, borderColor: Colors.divider },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, paddingVertical: 12 },
  statPillText: { fontSize: 14, fontWeight: '800' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.divider },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 18 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBadge: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  menuBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.bg, textTransform: 'uppercase', letterSpacing: 0.5 },
  version: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginTop: 32, marginBottom: 40 },
});
