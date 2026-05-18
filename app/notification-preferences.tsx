import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Card, Button } from '../components/ui';

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState({
    newIncident: true,
    incidentResolved: true,
    scanAlert: true,
    guardianAlert: true,
    parkingTimer: true,
    weeklyDigest: false,
    marketing: false,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function openSystemSettings() {
    Linking.openSettings();
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.amber, Colors.amberLight]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="notifications" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>Choose what alerts you receive</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionLabel}>Incident Alerts</Text>
          <PrefRow
            icon="alert-circle"
            color={Colors.critical}
            label="New Incident"
            desc="Someone reports an issue with your vehicle"
            value={prefs.newIncident}
            onToggle={() => toggle('newIncident')}
          />
          <PrefRow
            icon="checkmark-circle"
            color={Colors.success}
            label="Incident Resolved"
            desc="When you mark an incident as resolved"
            value={prefs.incidentResolved}
            onToggle={() => toggle('incidentResolved')}
          />
          <PrefRow
            icon="scan"
            color={Colors.primary}
            label="QR Scan Alert"
            desc="When someone scans your vehicle's QR sticker"
            value={prefs.scanAlert}
            onToggle={() => toggle('scanAlert')}
          />
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Safety Alerts</Text>
          <PrefRow
            icon="shield"
            color={Colors.primary}
            label="Guardian Network"
            desc="Community watch alerts for your area"
            value={prefs.guardianAlert}
            onToggle={() => toggle('guardianAlert')}
          />
          <PrefRow
            icon="time"
            color={Colors.amber}
            label="Parking Timer"
            desc="Reminders from your parking timer"
            value={prefs.parkingTimer}
            onToggle={() => toggle('parkingTimer')}
          />
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Other</Text>
          <PrefRow
            icon="newspaper"
            color={Colors.textSecondary}
            label="Weekly Digest"
            desc="Weekly summary of your vehicle's activity"
            value={prefs.weeklyDigest}
            onToggle={() => toggle('weeklyDigest')}
          />
          <PrefRow
            icon="megaphone"
            color={Colors.textMuted}
            label="Promotions & Updates"
            desc="Feature announcements and offers"
            value={prefs.marketing}
            onToggle={() => toggle('marketing')}
          />
        </Card>

        <Card style={{ backgroundColor: Colors.surfaceSecondary, shadowOpacity: 0 }}>
          <View style={styles.systemRow}>
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.systemTitle}>System Notification Settings</Text>
              <Text style={styles.systemDesc}>Manage notification permissions in device settings</Text>
            </View>
            <TouchableOpacity onPress={openSystemSettings} style={styles.openBtn}>
              <Text style={styles.openBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function PrefRow({ icon, color, label, desc, value, onToggle }: any) {
  return (
    <View style={styles.prefRow}>
      <View style={[styles.prefIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: Colors.primary, false: Colors.divider }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 8 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  prefIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  prefDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  systemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  systemTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  systemDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  openBtn: { backgroundColor: Colors.primaryBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  openBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
