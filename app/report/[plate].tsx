import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui';
import { getToken } from '../../hooks/useAuth';
import { API_BASE } from '../../hooks/usePushNotifications';

const REASONS = [
  { id: 'blocking',      label: 'Blocking driveway', icon: 'ban' },
  { id: 'lights',        label: 'Lights on / door open', icon: 'flashlight' },
  { id: 'accident',      label: 'Accident / scratch', icon: 'warning' },
  { id: 'wrong_parking', label: 'Wrong parking', icon: 'car' },
  { id: 'suspect',       label: 'Suspicious activity', icon: 'eye' },
  { id: 'emergency',     label: 'Emergency', icon: 'alert-circle' },
  { id: 'other',         label: 'Message for owner', icon: 'chatbubble' },
];

export default function InAppReportScreen() {
  const insets = useSafeAreaInsets();
  const { plate, code } = useLocalSearchParams<{ plate: string; code?: string }>();

  const [vehicleInfo, setVehicleInfo] = useState<{ make: string; color: string; stickerCode: string } | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [karmaEarned, setKarmaEarned] = useState(0);

  useEffect(() => {
    async function lookup() {
      try {
        // If we already have the sticker code, use it; otherwise look up by plate
        if (code) {
          const res = await fetch(`${API_BASE}/api/sticker/${code}`);
          if (res.ok) {
            const d = await res.json();
            setVehicleInfo({ make: d.vehicleMake, color: d.vehicleColor, stickerCode: code });
          }
        } else if (plate) {
          const res = await fetch(`${API_BASE}/api/sticker/by-plate/${plate}`);
          if (res.ok) {
            const d = await res.json();
            if (d.found) {
              setVehicleInfo({ make: d.vehicleMake, color: d.vehicleColor, stickerCode: d.sticker_code });
            }
          }
        }
      } catch { }
      setLoadingVehicle(false);
    }
    lookup();
  }, [plate, code]);

  async function handleSubmit() {
    if (!selectedReason) return;
    if (!vehicleInfo?.stickerCode) {
      Alert.alert('Error', 'Could not find this vehicle on LinkNPark.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stickerCode: vehicleInfo.stickerCode,
          reason: selectedReason,
          message: message.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setKarmaEarned(50);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.successScreen}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Report Sent!</Text>
          <Text style={styles.successSub}>The vehicle owner has been notified instantly.</Text>

          <View style={styles.karmaBadge}>
            <Ionicons name="star" size={20} color={Colors.amber} />
            <Text style={styles.karmaText}>+{karmaEarned} Karma Points earned</Text>
          </View>
          <Text style={styles.karmaNote}>View your karma in Guardian Network</Text>

          <Button
            label="Done"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={{ marginTop: 32, width: '100%' }}
            size="lg"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Vehicle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Vehicle info */}
        {loadingVehicle ? (
          <View style={styles.vehicleCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.lookingUp}>Looking up vehicle…</Text>
          </View>
        ) : vehicleInfo ? (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="car" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicleInfo.color} {vehicleInfo.make}</Text>
              <Text style={styles.vehiclePlate}>{plate?.toUpperCase()}</Text>
            </View>
            <View style={styles.reachableBadge}>
              <View style={styles.reachableDot} />
              <Text style={styles.reachableText}>Owner reachable</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.vehicleCard, { borderColor: Colors.critical }]}>
            <Ionicons name="alert-circle" size={24} color={Colors.critical} />
            <Text style={[styles.vehicleName, { color: Colors.critical, marginLeft: 12 }]}>
              Vehicle not found on LinkNPark
            </Text>
          </View>
        )}

        {/* Karma incentive banner */}
        <View style={styles.karmaBanner}>
          <Ionicons name="star" size={16} color={Colors.amber} />
          <Text style={styles.karmaBannerText}>You'll earn <Text style={{ fontWeight: '800', color: Colors.amber }}>+50 Karma</Text> for this report</Text>
        </View>

        {/* Reason selection */}
        <Text style={styles.sectionLabel}>What's the issue?</Text>
        <View style={styles.reasonGrid}>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reasonBtn, selectedReason === r.id && styles.reasonBtnActive]}
              onPress={() => setSelectedReason(r.id)}
            >
              <Ionicons name={r.icon as any} size={22} color={selectedReason === r.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.reasonLabel, selectedReason === r.id && styles.reasonLabelActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional message */}
        <Text style={styles.sectionLabel}>Add a note <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.messageInput}
          placeholder="e.g. Your headlights are on and keys might be inside"
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />

        <Button
          label={submitting ? 'Sending…' : 'Send Report'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedReason || !vehicleInfo || submitting}
          size="lg"
          style={{ marginTop: 8 }}
          icon={<Ionicons name="send" size={18} color="#fff" />}
        />

        <Text style={styles.privacyNote}>Your identity is kept private. The owner only sees the reason and your optional note.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scrollContent: { padding: 16, paddingBottom: 48 },

  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider,
    padding: 16, marginBottom: 12,
  },
  vehicleIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  vehicleName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  vehiclePlate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reachableBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reachableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  reachableText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  lookingUp: { fontSize: 14, color: Colors.textSecondary, marginLeft: 12 },

  karmaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${Colors.amber}18`, borderRadius: 12, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: `${Colors.amber}30`,
  },
  karmaBannerText: { fontSize: 13, color: Colors.textSecondary },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  optional: { textTransform: 'none', fontWeight: '400', fontSize: 12 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  reasonBtn: {
    flexBasis: '47%', flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.divider,
    padding: 14,
  },
  reasonBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  reasonLabelActive: { color: Colors.primary },

  messageInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 14, padding: 14, fontSize: 15, color: Colors.text,
    height: 90, textAlignVertical: 'top', marginBottom: 20,
  },
  privacyNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 16 },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  karmaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${Colors.amber}18`, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: `${Colors.amber}30`,
  },
  karmaText: { fontSize: 16, fontWeight: '700', color: Colors.amber },
  karmaNote: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },
});
