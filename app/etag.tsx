import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { useAuth } from '../hooks/useAuth';

const SCAN_BASE = 'https://scan.linknpark.in';

const VEHICLE_TYPES = [
  { id: 'car',        icon: 'car',          label: 'Car' },
  { id: 'bike',       icon: 'bicycle',      label: 'Bike' },
  { id: 'suv',        icon: 'car-sport',    label: 'SUV' },
  { id: 'truck',      icon: 'bus',          label: 'Truck' },
];

type Step = 'form' | 'preview';

export default function ETagScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const svgRef = useRef<any>(null);

  const [step, setStep] = useState<Step>('form');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [error, setError] = useState('');

  // The QR code encodes the scan URL with the plate number as a query
  // so even without a physical sticker, anyone can scan and find the owner
  const qrValue = `${SCAN_BASE}/plate?p=${plate.replace(/\s/g, '').toUpperCase()}`;

  function handleGenerate() {
    const cleaned = plate.replace(/\s/g, '').toUpperCase();
    if (!cleaned || cleaned.length < 4) {
      setError('Please enter a valid plate number (e.g. KA01AB1234)');
      return;
    }
    setError('');
    setPlate(cleaned);
    setStep('preview');
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `🚗 My vehicle ${plate} is on LinkNPark!\n\nScan my QR code or visit:\n${qrValue}\n\nYou can contact me anonymously if my vehicle is causing any issue. No phone number needed.\n\nGet your free eTag at linknpark.in`,
        url: qrValue,
        title: `LinkNPark eTag — ${plate}`,
      });
    } catch {}
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => step === 'preview' ? setStep('form') : router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free eTag</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP: FORM ────────────────────────────────── */}
        {step === 'form' && (
          <View style={styles.container}>
            {/* Hero banner */}
            <LinearGradient
              colors={[Colors.primaryBg, 'transparent']}
              style={styles.heroBanner}
            >
              <View style={styles.heroIconWrap}>
                <Ionicons name="qr-code" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.heroTitle}>Your Free Digital{'\n'}Vehicle Identity</Text>
              <Text style={styles.heroSub}>
                Generate a QR code for your vehicle — free forever. Save it as your wallpaper, print it, or share it.
                Anyone who scans it can contact you without knowing your number.
              </Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}>
                  <Ionicons name="infinite" size={13} color={Colors.primary} />
                  <Text style={styles.heroBadgeText}>Free forever</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
                  <Text style={styles.heroBadgeText}>Privacy protected</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="flash" size={13} color={Colors.primary} />
                  <Text style={styles.heroBadgeText}>Instant alerts</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Vehicle Plate Number</Text>
              <TextInput
                style={styles.plateInput}
                value={plate}
                onChangeText={t => setPlate(t.toUpperCase())}
                placeholder="KA01AB1234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <View style={styles.typeRow}>
                {VEHICLE_TYPES.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.typeChip, vehicleType === v.id && styles.typeChipActive]}
                    onPress={() => setVehicleType(v.id)}
                  >
                    <Ionicons
                      name={v.icon as any}
                      size={20}
                      color={vehicleType === v.id ? Colors.bg : Colors.textSecondary}
                    />
                    <Text style={[styles.typeChipLabel, vehicleType === v.id && styles.typeChipLabelActive]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Your Name (optional)</Text>
              <TextInput
                style={styles.nameInput}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="How should reporters address you?"
                placeholderTextColor={Colors.textMuted}
                maxLength={40}
              />

              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
                <Ionicons name="qr-code" size={20} color={Colors.bg} />
                <Text style={styles.generateBtnText}>Generate My Free eTag</Text>
              </TouchableOpacity>
            </View>

            {/* Upgrade prompt */}
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeLeft}>
                <Ionicons name="star" size={20} color={Colors.amber} />
                <View>
                  <Text style={styles.upgradeTitle}>Want a physical sticker?</Text>
                  <Text style={styles.upgradeSub}>NFC + QR sticker for your car, weatherproof</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/store' as any)} style={styles.upgradeBtn}>
                <Text style={styles.upgradeBtnText}>Shop →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP: QR PREVIEW ──────────────────────────── */}
        {step === 'preview' && (
          <View style={styles.container}>
            <Text style={styles.previewTitle}>Your eTag is ready</Text>
            <Text style={styles.previewSub}>
              Save this QR code. Anyone who scans it can contact you without seeing your number.
            </Text>

            {/* QR Card — designed to be screenshotted */}
            <View style={styles.qrCard}>
              <LinearGradient
                colors={[Colors.surface, Colors.surfaceSecondary]}
                style={styles.qrCardInner}
              >
                <View style={styles.qrCardHeader}>
                  <Text style={styles.qrBrand}>LinkNPark</Text>
                  <Text style={styles.qrBrandDot}> ●</Text>
                </View>

                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrValue}
                    size={200}
                    color={Colors.bg}
                    backgroundColor={Colors.primary}
                    logo={undefined}
                    getRef={c => (svgRef.current = c)}
                  />
                </View>

                <Text style={styles.qrPlate}>{plate}</Text>
                {ownerName ? <Text style={styles.qrOwner}>{ownerName}</Text> : null}

                <View style={styles.qrFooter}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                  <Text style={styles.qrFooterText}>Scan to contact · Privacy protected</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How to use your eTag</Text>
              {[
                { icon: 'phone-portrait', text: 'Screenshot this QR and set it as your lock screen wallpaper' },
                { icon: 'print', text: 'Or print it and laminate it for your dashboard' },
                { icon: 'share-social', text: 'Share the link with your RWA group so they can reach you' },
                { icon: 'arrow-up-circle', text: 'Upgrade to a physical NFC sticker for tap-to-contact' },
              ].map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={styles.instructionIcon}>
                    <Ionicons name={step.icon as any} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.instructionText}>{step.text}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social" size={20} color={Colors.bg} />
              <Text style={styles.shareBtnText}>Share My eTag Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.physicalBtn}
              onPress={() => router.push('/(tabs)/store' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={20} color={Colors.amber} />
              <Text style={styles.physicalBtnText}>Get Physical Sticker (Premium)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={() => setStep('form')}>
              <Text style={styles.editBtnText}>Edit vehicle details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },

  container: { flex: 1, padding: 20, alignItems: 'center' },

  heroBanner: { width: '100%', borderRadius: 28, padding: 24, alignItems: 'center', marginBottom: 28 },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: Colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 },
  heroSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.divider,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.text },

  form: { width: '100%', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  plateInput: {
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 22, fontWeight: '900', color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider, letterSpacing: 2,
  },
  errorText: { fontSize: 13, color: Colors.critical, fontWeight: '600', marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.divider,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  typeChipLabelActive: { color: Colors.bg },
  nameInput: {
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 20, gap: 10,
    paddingVertical: 18, marginTop: 12,
  },
  generateBtnText: { fontSize: 17, fontWeight: '900', color: Colors.bg },

  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.divider, width: '100%', marginTop: 24,
  },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  upgradeTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  upgradeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  upgradeBtn: { backgroundColor: Colors.amberBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  upgradeBtnText: { fontSize: 14, fontWeight: '800', color: Colors.amber },

  previewTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  previewSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 8 },

  qrCard: { width: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.divider, marginBottom: 24 },
  qrCardInner: { padding: 28, alignItems: 'center' },
  qrCardHeader: { flexDirection: 'row', marginBottom: 24 },
  qrBrand: { fontSize: 20, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  qrBrandDot: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  qrWrapper: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, padding: 4, backgroundColor: Colors.primary },
  qrPlate: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: 4, marginBottom: 4 },
  qrOwner: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600', marginBottom: 20 },
  qrFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrFooterText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },

  instructionsCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: 28, padding: 24,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: 24, gap: 16,
  },
  instructionsTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  instructionIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  instructionText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20, fontWeight: '500', paddingTop: 8 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 20, gap: 10,
    paddingVertical: 18, width: '100%', marginBottom: 12,
  },
  shareBtnText: { fontSize: 17, fontWeight: '900', color: Colors.bg },
  physicalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.amberBg, borderRadius: 20, gap: 10,
    paddingVertical: 18, width: '100%', marginBottom: 12,
    borderWidth: 1, borderColor: Colors.amber,
  },
  physicalBtnText: { fontSize: 16, fontWeight: '800', color: Colors.amber },
  editBtn: { paddingVertical: 12 },
  editBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },
});
