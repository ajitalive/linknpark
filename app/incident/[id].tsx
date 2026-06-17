import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, IncidentColors } from '../../constants/Colors';
import { Card, Button, Badge } from '../../components/ui';
import { IncidentIcon } from '../../components/IncidentIcon';
import { useIncidents, resolveIncident } from '../../hooks/useApi';
import Constants from 'expo-constants';
import { API_BASE as API_URL } from '../../hooks/usePushNotifications';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type ChatMessage = { sender: string; text: string; ts: number };

export default function IncidentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { incidents, loading, refresh, setIncidents } = useIncidents();
  const incident = incidents.find(i => i.id === id);
  const [resolving, setResolving] = useState(false);
  useEffect(() => {
    // Legacy inline chat removed - handled by Car Connect chat screen
  }, [id]);

  if (loading && !incident) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bg, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.textMuted} />
        <Text style={styles.notFoundTitle}>Incident not found</Text>
        <Text style={styles.notFoundSub}>It may have been deleted or doesn't belong to you.</Text>
        <Button label="Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const meta = IncidentColors[incident.reason as keyof typeof IncidentColors];
  const label = meta?.label || incident.reason_label || incident.reason;
  const color = meta?.color || Colors.high;
  const sticker = incident.stickers;
  const isResolved = incident.status !== 'open';
  
  const severityText = color === Colors.critical ? 'CRITICAL' 
    : color === Colors.high ? 'HIGH' 
    : color === Colors.medium ? 'MEDIUM' 
    : color === Colors.low ? 'LOW' 
    : 'INFO';

  async function handleResolve(status: 'resolved' | 'dismissed') {
    setResolving(true);
    try {
      const updated = await resolveIncident(incident!.id, status);
      setIncidents(prev => prev.map(i => i.id === incident!.id ? { ...i, ...updated } : i));
      refresh();
    } catch (e: any) {
      Alert.alert('Could not update', e?.message || 'Try again');
    } finally {
      setResolving(false);
    }
  }

  function handleCall() {
    if (incident!.reporter_phone) Linking.openURL(`tel:${incident!.reporter_phone}`);
  }

  function handleWhatsApp() {
    if (incident!.reporter_phone) {
      const num = incident!.reporter_phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${num}`);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/incidents');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <IncidentIcon type={incident.reason as any} size={28} />
          <Text style={styles.headerTitle}>{label}</Text>
          <Text style={styles.headerVehicle}>
            {sticker?.registration || incident.sticker_code}
            {sticker?.vehicle_name ? ` · ${sticker.vehicle_name}` : ''}
          </Text>
          <Badge
            label={isResolved ? incident.status.toUpperCase() : severityText}
            color={isResolved ? Colors.success : color}
            bg="rgba(255,255,255,0.25)"
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.scannerRow}>
            <View style={styles.scannerAvatar}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scannerName}>
                {incident.reporter_phone || 'Anonymous'}
              </Text>
              <Text style={styles.scannerTime}>{timeAgo(incident.reported_at)}</Text>
            </View>
          </View>
          {incident.message ? (
            <Text style={styles.scannerMsg}>"{incident.message}"</Text>
          ) : (
            <Text style={[styles.scannerMsg, { color: Colors.textMuted, fontStyle: 'italic' }]}>
              No message provided
            </Text>
          )}
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
            <Text style={styles.sectionLabel}>Car Connect (Live Chat)</Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
              Chat securely with the visitor who scanned your vehicle.
            </Text>
          </View>
          <View style={{ padding: 16 }}>
            <Button 
              label="Open Live Chat" 
              icon={<Ionicons name="chatbubbles" size={18} color="#fff" />}
              onPress={() => router.push(`/chat/${incident.id}` as any)}
              style={{ backgroundColor: '#15803D' }}
            />
          </View>
        </Card>

        {!isResolved && incident.reporter_phone && (
          <View style={styles.quickActions}>
            <QuickAction icon="call" label="Call" color={Colors.primary} bg={Colors.primaryBg} onPress={handleCall} />
            <QuickAction icon="logo-whatsapp" label="WhatsApp" color="#25D366" bg="#F0FDF4" onPress={handleWhatsApp} />
          </View>
        )}

        <Card>
          <Text style={styles.sectionLabel}>Report Details</Text>
          <InfoRow label="Reason" value={label} />
          <InfoRow label="Reported" value={new Date(incident.reported_at).toLocaleString('en-IN')} />
          {incident.resolved_at ? (
            <InfoRow
              label={incident.status === 'resolved' ? 'Resolved' : 'Dismissed'}
              value={new Date(incident.resolved_at).toLocaleString('en-IN')}
            />
          ) : null}
          <InfoRow label="Severity" value={incident.severity.toUpperCase()} />
          <InfoRow label="Sticker" value={incident.sticker_code} mono />
        </Card>

        {!isResolved ? (
          <>
            <Button
              label={resolving ? 'Updating…' : 'Mark as Resolved'}
              onPress={() => handleResolve('resolved')}
              size="lg"
              disabled={resolving}
              icon={<Ionicons name="checkmark-circle" size={18} color="#fff" />}
            />
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleResolve('dismissed')}
              disabled={resolving}
            >
              <Text style={styles.dismissText}>Dismiss as spam or irrelevant</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Card style={{ backgroundColor: Colors.successBg, shadowOpacity: 0 }}>
            <View style={styles.resolvedCard}>
              <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
              <View>
                <Text style={styles.resolvedTitle}>
                  Incident {incident.status === 'resolved' ? 'resolved' : 'dismissed'}
                </Text>
                <Text style={styles.resolvedSub}>
                  Closed · {incident.resolved_at ? timeAgo(incident.resolved_at) : timeAgo(incident.reported_at)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: 'monospace', fontSize: 12 }]}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 16 },
  notFoundSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { paddingVertical: 12 },
  headerContent: { alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerVehicle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  scannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  scannerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  scannerName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  scannerTime: { fontSize: 13, color: Colors.textMuted },
  scannerMsg: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quickAction: { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 16, gap: 6 },
  quickLabel: { fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  dismissBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  dismissText: { fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resolvedTitle: { fontSize: 16, fontWeight: '700', color: Colors.success },
  resolvedSub: { fontSize: 13, color: Colors.success },
});
