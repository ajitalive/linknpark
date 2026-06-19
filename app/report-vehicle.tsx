import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/Colors';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const INCIDENT_TYPES = [
  { id: 'blocking_exit',   icon: 'car',             label: 'Blocking Exit',    desc: 'Vehicle is blocking the exit' },
  { id: 'blocking_entry',  icon: 'enter',           label: 'Blocking Entry',   desc: 'Vehicle is blocking the entrance' },
  { id: 'double_parked',   icon: 'layers',          label: 'Double Parked',    desc: 'Parked beside another vehicle' },
  { id: 'lights_on',       icon: 'flashlight',      label: 'Lights On',        desc: 'Headlights or indicators left on' },
  { id: 'damage',          icon: 'warning',         label: 'Damage Noticed',   desc: 'Visible damage to the vehicle' },
  { id: 'other',           icon: 'ellipsis-horizontal', label: 'Other',       desc: 'Something else needs attention' },
];

type Step = 'plate' | 'found' | 'not_found' | 'incident' | 'done';

interface VehicleInfo {
  found: boolean;
  vehicleType?: string;
  vehicleColor?: string;
  vehicleMake?: string;
  platePartial?: string;
  tagType?: string;
  ownerReachable?: boolean;
  sticker_code?: string;
}

export default function ReportVehicleScreen() {
  const insets = useSafeAreaInsets();
  const { plate: initialPlate } = useLocalSearchParams<{ plate?: string }>();

  const [step, setStep] = useState<Step>('plate');
  const [plate, setPlate] = useState(initialPlate?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [message, setMessage] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reportedIncidentId, setReportedIncidentId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const inputRef = useRef<TextInput>(null);

  async function pickImage() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  }

  async function handleSearch() {
    const cleaned = plate.replace(/\s/g, '').toUpperCase();
    if (!cleaned || cleaned.length < 4) {
      setError('Please enter a valid plate number (e.g. KA01AB1234)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sticker/by-plate/${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (res.ok && data.found) {
        setVehicleInfo({ ...data, sticker_code: data.sticker_code });
        setStep('found');
      } else {
        setVehicleInfo(null);
        setStep('not_found');
      }
    } catch {
      setError('Could not reach server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReport() {
    if (!selectedIncident) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stickerCode: vehicleInfo?.sticker_code,
          reason: selectedIncident,
          message: message.trim() || null,
          reporterPhone: reporterPhone.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Could not send report. Try again.');
      }
      
      const data = await res.json();
      const incidentId = data.reportId;

      // Upload photo if exists
      if (photo && incidentId) {
        const formData = new FormData();
        const filename = photo.uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        
        formData.append('photo', { uri: photo.uri, name: filename, type } as any);

        const photoRes = await fetch(`${API_BASE}/api/report/${incidentId}/photo`, {
          method: 'POST',
          body: formData,
        });
        
        if (!photoRes.ok) {
          console.warn('Photo upload failed');
        }
      }

      setReportedIncidentId(incidentId);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Could not reach server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, zIndex: 50 }]}>
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} 
          style={[styles.backBtn, { zIndex: 50 }]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report a Vehicle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP: PLATE ENTRY ─────────────────────────── */}
        {step === 'plate' && (
          <View style={styles.stepContainer}>
            <View style={styles.heroIcon}>
              <Ionicons name="search" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.stepTitle}>Enter the vehicle's{'\n'}plate number</Text>
            <Text style={styles.stepSub}>
              No account needed. The owner will be notified anonymously — your number stays private.
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.plateInput}
                value={plate}
                onChangeText={t => setPlate(t.toUpperCase())}
                placeholder="KA01AB1234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={[styles.searchBtn, loading && { opacity: 0.6 }]}
                onPress={handleSearch}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={Colors.bg} />
                  : <Ionicons name="arrow-forward" size={22} color={Colors.bg} />
                }
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
              <Text style={styles.privacyText}>
                Your identity is never shared with the vehicle owner
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP: VEHICLE FOUND ───────────────────────── */}
        {step === 'found' && vehicleInfo && (
          <View style={styles.stepContainer}>
            <View style={styles.foundCard}>
              <LinearGradient
                colors={['rgba(215,255,0,0.08)', 'rgba(215,255,0,0.02)']}
                style={styles.foundGradient}
              >
                <View style={styles.foundBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  <Text style={styles.foundBadgeText}>Vehicle registered on LinkNPark</Text>
                </View>
                <Text style={styles.plateDisplay}>
                  {plate.replace(/(\w{2})(\w{2})(\w{2})(\w+)/, '$1 $2 $3 $4')}
                </Text>
                <Text style={styles.vehicleDesc}>
                  {vehicleInfo.vehicleColor} {vehicleInfo.vehicleMake} · {vehicleInfo.vehicleType}
                </Text>
              </LinearGradient>
            </View>

            <Text style={styles.stepTitle}>What's the issue?</Text>
            <Text style={styles.stepSub}>Select a reason — the owner will be notified immediately.</Text>

            <View style={styles.incidentGrid}>
              {INCIDENT_TYPES.map(inc => (
                <TouchableOpacity
                  key={inc.id}
                  style={[styles.incidentChip, selectedIncident === inc.id && styles.incidentChipActive]}
                  onPress={() => setSelectedIncident(inc.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.incidentChipIcon, selectedIncident === inc.id && styles.incidentChipIconActive]}>
                    <Ionicons
                      name={inc.icon as any}
                      size={20}
                      color={selectedIncident === inc.id ? Colors.bg : Colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.incidentChipLabel, selectedIncident === inc.id && styles.incidentChipLabelActive]}>
                    {inc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.optionalSection}>
              <Text style={styles.optionalLabel}>Add a note (optional)</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="e.g. Blocking gate 2, urgent..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={280}
              />
            </View>

            <View style={styles.optionalSection}>
              <Text style={styles.optionalLabel}>Photo evidence (optional)</Text>
              {!photo ? (
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.photoBtnText}>Take a photo</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhoto(null)}>
                    <Ionicons name="close-circle" size={24} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.optionalSection}>
              <Text style={styles.optionalLabel}>Your phone (optional, for callback)</Text>
              <TextInput
                style={styles.phoneInput}
                value={reporterPhone}
                onChangeText={setReporterPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
              />
              <Text style={styles.phoneDisclaimer}>
                Only shared with owner if they choose to call you back
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, (!selectedIncident || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmitReport}
              disabled={!selectedIncident || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <>
                    <Ionicons name="notifications" size={20} color={Colors.bg} />
                    <Text style={styles.submitBtnText}>Notify Owner Now</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: NOT FOUND ───────────────────────────── */}
        {step === 'not_found' && (
          <View style={styles.stepContainer}>
            <View style={[styles.heroIcon, { backgroundColor: Colors.surfaceSecondary }]}>
              <Ionicons name="car-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={styles.stepTitle}>Vehicle not on{'\n'}LinkNPark yet</Text>
            <Text style={styles.stepSub}>
              <Text style={{ fontWeight: '800', color: Colors.text }}>{plate}</Text>
              {' '}hasn't been registered. You can share the app with the owner so they can join and protect their vehicle.
            </Text>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => Linking.openURL(`https://linknpark.in?ref=report&plate=${plate}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social" size={20} color={Colors.bg} />
              <Text style={styles.shareBtnText}>Invite Owner to LinkNPark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setStep('plate'); setError(''); }}
            >
              <Text style={styles.retryBtnText}>Try a Different Plate</Text>
            </TouchableOpacity>

            <View style={styles.howItWorksCard}>
              <Text style={styles.howTitle}>How it works</Text>
              {[
                'Owner registers their vehicle on LinkNPark',
                'They get a smart QR sticker for their car',
                'You scan or search the plate — they get instant alerts',
              ].map((step, i) => (
                <View key={i} style={styles.howStep}>
                  <View style={styles.howNum}><Text style={styles.howNumText}>{i + 1}</Text></View>
                  <Text style={styles.howStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP: DONE ────────────────────────────────── */}
        {step === 'done' && (
          <View style={styles.stepContainer}>
            <LinearGradient
              colors={[Colors.primaryBg, Colors.bg]}
              style={styles.doneGradient}
            >
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.doneTitle}>Owner Notified!</Text>
              <Text style={styles.doneSub}>
                The owner has received a real-time alert on their phone. They should respond shortly.
              </Text>
              <View style={styles.doneBadgeRow}>
                <View style={styles.doneBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                  <Text style={styles.doneBadgeText}>Privacy protected</Text>
                </View>
                <View style={styles.doneBadge}>
                  <Ionicons name="flash" size={14} color={Colors.primary} />
                  <Text style={styles.doneBadgeText}>Real-time alert</Text>
                </View>
              </View>
            </LinearGradient>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>

            {reportedIncidentId && (
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider, marginTop: 12 }]}
                onPress={() => router.push(`/chat/${reportedIncidentId}?visitor=true` as any)}
                activeOpacity={0.85}
              >
                <Text style={[styles.doneBtnText, { color: Colors.text }]}>Live Chat with Owner</Text>
              </TouchableOpacity>
            )}

            <View style={styles.downloadPrompt}>
              <Text style={styles.downloadPromptText}>
                Want alerts for your own vehicle?
              </Text>
              <TouchableOpacity onPress={() => router.push('/activate' as any)}>
                <Text style={styles.downloadPromptLink}>Get a LinkNPark sticker →</Text>
              </TouchableOpacity>
            </View>
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

  stepContainer: { flex: 1, padding: 24, paddingTop: 12, alignItems: 'center' },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginTop: 16,
  },
  stepTitle: {
    fontSize: 28, fontWeight: '900', color: Colors.text,
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 12,
  },
  stepSub: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 32, paddingHorizontal: 8,
  },

  inputRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 12 },
  plateInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 22, fontWeight: '900', color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider,
    letterSpacing: 2,
  },
  searchBtn: {
    width: 60, backgroundColor: Colors.primary, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { fontSize: 13, color: Colors.critical, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  privacyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryBg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12, marginTop: 8,
  },
  privacyText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  foundCard: { width: '100%', marginBottom: 28, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.divider },
  foundGradient: { padding: 24, alignItems: 'center' },
  foundBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  foundBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  plateDisplay: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: 3, marginBottom: 8 },
  vehicleDesc: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  incidentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', marginBottom: 24 },
  incidentChip: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 20,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.divider,
  },
  incidentChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  incidentChipIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  incidentChipIconActive: { backgroundColor: Colors.primary },
  incidentChipLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  incidentChipLabelActive: { color: Colors.primary },

  optionalSection: { width: '100%', marginBottom: 16 },
  optionalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  messageInput: {
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 16, color: Colors.text, fontSize: 15,
    borderWidth: 1, borderColor: Colors.divider,
    minHeight: 90, textAlignVertical: 'top',
  },
  photoBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface,
  },
  photoBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    position: 'relative',
    height: 120,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  phoneInput: {
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 16,
    color: Colors.text, fontSize: 16, fontWeight: '600',
    borderWidth: 1, borderColor: Colors.divider,
  },
  phoneDisclaimer: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontWeight: '500' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 20, gap: 10,
    paddingVertical: 18, width: '100%', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 17, fontWeight: '900', color: Colors.bg },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 20, gap: 10,
    paddingVertical: 18, width: '100%', marginBottom: 16,
  },
  shareBtnText: { fontSize: 17, fontWeight: '900', color: Colors.bg },
  retryBtn: { paddingVertical: 12 },
  retryBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },

  howItWorksCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 28, padding: 24, marginTop: 24,
    borderWidth: 1, borderColor: Colors.divider, gap: 16,
  },
  howTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  howNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  howNumText: { fontSize: 14, fontWeight: '900', color: Colors.primary },
  howStepText: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '500', lineHeight: 20 },

  doneGradient: { width: '100%', borderRadius: 28, padding: 32, alignItems: 'center', marginBottom: 24 },
  doneIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  doneTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, marginBottom: 12, letterSpacing: -0.5 },
  doneSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  doneBadgeRow: { flexDirection: 'row', gap: 12 },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryBg, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingVertical: 18, width: '100%', alignItems: 'center',
  },
  doneBtnText: { fontSize: 17, fontWeight: '900', color: Colors.bg },
  downloadPrompt: { marginTop: 24, alignItems: 'center', gap: 8 },
  downloadPromptText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  downloadPromptLink: { fontSize: 15, color: Colors.primary, fontWeight: '800' },
});
